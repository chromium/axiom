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
var NodeSkeletonFileSystem = require('axiom/fs/stream/node_skeleton_file_system').default;
var TTYState = require('axiom/fs/tty_state').default;
var washExecutables = require('wash/exe_modules').dir;

if ('setRawMode' in process.stdin) {
  // Stdin seems to be missing setRawMode under grunt.
  process.stdin.setRawMode(true);
}

var WebSocketServer = require('ws').Server;

var WebSocketFs = function(cx, port) {
  this.cx_ = cx;
  this.port_ = port;
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
    this.println('connection!');
    // TODO(rpaquay): Hard code to be "nodefs:" for now.
    var localFs = this.cx_.fileSystemManager.getFileSystems()[1];
    var fs = new NodeSkeletonFileSystem(ws, localFs);
  }.bind(this));

  this.println('WebSocket server running on port ' + this.port_);
  this.println('Press Ctrl-C to terminate.');
  return this.completer_.promise;
};

var WebSocketFileSystem = function(webSocket) {
  this.webSocket_ = webSocket;
};

/*
 * A custom executable to expose the local node fs over stream transport.
 */
var socketfs = {
  name: 'socketfs',

  main: function(cx) {
    cx.ready();
    var server = new WebSocketFs(cx, 8000);
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
        if (buffer == '\x03')
          cx.closeError(new AxiomError.Interrupt());

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
