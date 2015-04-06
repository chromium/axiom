#!/usr/bin/env nodejs

if (!process.env.NODE_PATH) {
  console.log('Please set NODE_PATH to an absolute /path/to/axiom/tmp/cjs/lib');
  process.exit(-1);
}

global.Promise = require('es6-promise').Promise;

require('source-map-support').install();

var Completer = require('axiom/core/completer').default;
var AxiomError = require('axiom/core/error').default;
var Path = require('axiom/fs/path').default;
var FileSystemManager = require('axiom/fs/base/file_system_manager').default;
var StdioSource = require('axiom/fs/stdio_source').default;
var JsFileSystem = require('axiom/fs/js/file_system').default;
var NodeFileSystem = require('axiom/fs/node/file_system').default;
var NodeWebSocketStreams = require('axiom/fs/stream/node_web_socket_streams').default;
var Transport = require('axiom/fs/stream/transport').default;
var Channel = require('axiom/fs/stream/channel').default;
var SkeletonFileSystem = require('axiom/fs/stream/skeleton_file_system').default;
var TTYState = require('axiom/fs/tty_state').default;
var washExecutables = require('wash/exe_modules').dir;

if ('setRawMode' in process.stdin) {
  // Stdin seems to be missing setRawMode under grunt.
  process.stdin.setRawMode(true);
}

var WebSocketServer = require('ws').Server;

var WebSocketFs = function(cx, port, fileSystemName) {
  this.cx_ = cx;
  this.port_ = port;
  this.fileSystemName_ = fileSystemName;
  this.wss_ = new WebSocketServer({ port: port });
  this.completer_ = new Completer();
  this.cx_.onClose.addListener(function() {
    this.println('closing server');
    this.wss_.close();
    this.completer_.resolve();
  }.bind(this));
};

WebSocketFs.prototype.println = function(msg) {
  this.cx_.stdout.write(msg + '\n');
};

WebSocketFs.prototype.run = function() {
  this.wss_.on('connection', function (ws) {
    try {
     this.openFileSystem(ws);
     this.println('WebSocket file system connection accepted');
    }
    catch(error) {
      this.println('WebSocket file system connection error: ' + error.message);
      console.log(error);
      ws.close();
    }
  }.bind(this));

  this.println('WebSocket server for file system "' + this.fileSystemName_ +
      '" running on port ' + this.port_);
  this.println('Waiting for connectons, press Ctrl-C to terminate.');
  return this.completer_.promise;
};

WebSocketFs.prototype.openFileSystem = function(webSocket) {
  var fileSystem = null;
  this.cx_.fileSystemManager.getFileSystems().forEach(function(fs) {
    if (fs.rootPath.root === this.fileSystemName_) {
      fileSystem = fs;
    }
  }.bind(this));
  if (!fileSystem)
    throw new AxiomError.NotFound('file system', this.fileSystemName_);

  var streams = new NodeWebSocketStreams(webSocket);
  var transport = new Transport(
      'NodeWebSocketTransport',
      streams.readableStream,
      streams.writableStream);
  var channel = new Channel('NodeWebSocketChannel', transport);
  var skeleton = new SkeletonFileSystem('nodefs', fileSystem, channel);
  streams.resume();
};

/*
 * A custom executable to expose the local node fs over stream transport.
 */
var socketfs = {
  name: 'socketfs',

  main: function(cx) {
    cx.ready();

    var port = cx.getArg('port');
    var fileSystem = cx.getArg('filesystem');
    if (!port || !fileSystem || cx.getArg('help')) {
      cx.stdout.write([
        'usage: socketfs -p|--port <port> -f|--filesystem <file-system-name>',
        'Create a new stream located at <path>.',
        '',
        'Options:',
        '',
        '  -h, --help',
        '      Print this help message and exit.',
        '  -p, --port <port>',
        '      The WebSocket port to listen to.',
        '  -f, --filesystem <file-system-name>',
        '      The name of the filesystem to expose on WebSocket connections.',
        '',
      ].join('\r\n') + '\r\n');

      cx.closeOk();
      return;
    }

    var server = new WebSocketFs(cx, port, fileSystem);
    server.run().then(
      function() {
        cx.closeOk();
      }
    ).catch(
      function(error) {
        cx.closeError(error);
      }
    );
  },

  signature: {
    'help|h': '?',
    'port|p': '*',
    'filesystem|f': '$',
    '_': '@'
  }
};

function onResize(stdioSource) {
  var tty = new TTYState();
  tty.isatty = process.stdout.isTTY;
  tty.rows = process.stdout.rows;
  tty.columns = process.stdout.columns;
  stdioSource.signal.write({name: 'tty-change', value: tty});
}

function startWash(fsm) {
  // TODO(rpaquay)
  var stdioSource = new StdioSource();
  var stdio = stdioSource.stdio;
  return fsm.createExecuteContext(new Path('jsfs:exe/wash'), stdio, {}).then(
    function(cx) {
      stdioSource.stdout.onData.addListener(function(value) {
        process.stdout.write(value);
      });

      stdioSource.stderr.onData.addListener(function(value) {
        process.stderr.write(value);
      });

      cx.onReady.addListener(function() {
        // Resume all streams (except stdin as we want to buffer input until a
        // consumer is ready to process it).
        stdioSource.stdout.resume();
        stdioSource.stderr.resume();
        stdioSource.stdio.signal.resume();
      }.bind(this));

      cx.onClose.addListener(function(reason, value) {
        console.log('wash closed: ' + reason + ', ' + value);
      });

      process.stdin.on('data', function(buffer) {
        // Ctrl-C
        if (buffer == '\x03') {
          stdioSource.signal.write({name: 'interrupt'});
          return;
        }

        stdioSource.stdin.write(buffer.toString());
      });

      onResize(stdioSource);
      process.stdout.on('resize', onResize.bind(null, stdioSource));

      var home = new Path('nodefs:').combine(process.env.HOME);
      cx.setEnv('$HOME', home.spec);
      cx.setEnv('$HISTFILE', home.combine('.wash_history').spec);
      if (process.env.PWD) {
        cx.setEnv('$PWD', new Path('nodefs:').combine(process.env.PWD).spec);
      }
      cx.setEnv('@PATH', [new Path('jsfs:exe').spec]);

      return cx.execute();
    });
}

function main() {
  var jsfs = new JsFileSystem();
  var fsm = jsfs.fileSystemManager;
  return jsfs.rootDirectory.mkdir('exe').then(function(jsdir) {
    jsdir.install(washExecutables);
    var cmds = {};
    socketfs.main.signature = socketfs.signature;
    cmds[socketfs.name] = socketfs.main;
    jsdir.install(cmds);
    mountNodefs(fsm);
    return startWash(fsm);
  });
}

function mountNodefs(fsm) {
  var fs = require('fs');
  NodeFileSystem.mount(fsm, 'nodefs', fs);
}

module.exports = { main: main };


if (/wash.js$/.test(process.argv[1])) {
  // Keep node from exiting due to lack of events.
  var aliveInterval = setInterval(function() {}, 60 * 1000);

  main().then(function(value) {
    console.log('exit:', value);
    process.exit();
  }).catch(function(err) {
    console.log('Uncaught exception:', err, err.stack);
    process.exit();
  });
}
