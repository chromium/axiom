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

var WebSocketFs = function(cx, options) {
  this.cx_ = cx;
  this.options_ = options;
};

WebSocketFs.prototype.println = function(msg) {
  this.cx_.stdout.write(msg + '\n');
};

WebSocketFs.prototype.run = function() {
  return this.createServer_().then(function(wss) {
    return new Promise(function(resolve, reject) {
      this.cx_.onClose.listenOnce(function(reason, value) {
        console.log('Shutting down WebSocket server');
        console.log('  reason:', reason);
        console.log('  value:', value);
        wss.close();
        resolve();
      }.bind(this));

      wss.on('connection', function (ws) {
        try {
         this.openFileSystem_(ws);
         this.println('WebSocket file system connection accepted');
        }
        catch(error) {
          this.println('WebSocket file system connection error: '
              + error.message);
          console.log(error);
          ws.close();
        }
      }.bind(this));

      wss.on('error', function (error) {
        this.println('WebSocket server error', error);
      }.bind(this));

      var msg = 'WebSocket server for file system "' +
          this.options_.fileSystem + '" running on port ' + this.options_.port;
      if (this.options_.ssl) {
        msg += ' using SSL connections';
      }
      this.println(msg);
      this.println('Waiting for connections, press Ctrl-C to terminate.');
    }.bind(this));
  }.bind(this));
};

WebSocketFs.prototype.createServer_ = function() {
  return Promise.resolve().then(function() {
    var cfg = this.options_;
    if (cfg.ssl) {
      var keyPath = Path.abs(this.cx_.getPwd(), cfg.key || 'key.pem');
      var certPath = Path.abs(this.cx_.getPwd(), cfg.cert || 'cert.pem');
      var p1 = this.cx_.fileSystemManager.readFile(keyPath);
      var p2 = this.cx_.fileSystemManager.readFile(certPath);
      return Promise.all([p1, p2]).then(function(values) {
        return {
          key: values[0].data,
          cert: values[1].data
        };
      }.bind(this));
    }
    return null;
  }.bind(this)).then(function(result) {
    var httpServ = result ? require('https') : require('http');

    // dummy request processing
    var processRequest = function( req, res ) {
        res.writeHead(200);
        res.end("All glory to WebSockets!\n");
    };

    // Create the http(s) server.
    var server = null;
    if (result) {
      server = httpServ.createServer({
        key: result.key,
        cert: result.cert
      }, processRequest).listen(this.options_.port);
    } else {
      server = httpServ.createServer(processRequest).listen(this.options_.port);
    }

    // Passing the reference to web server so WS knows port/SSL capabilities.
    var wss = new WebSocketServer({ server: server });
    return Promise.resolve(wss);
  }.bind(this));
};

WebSocketFs.prototype.openFileSystem_ = function(webSocket) {
  var fileSystems = this.cx_.fileSystemManager.getFileSystems().filter(
    function(fs) {
      return fs.name === this.options_.fileSystem;
    }.bind(this));
  if (fileSystems.length !== 1)
    throw new AxiomError.NotFound('file system', this.options_.fileSystem);
  var fileSystem = fileSystems[0];

  var streams = new NodeWebSocketStreams(webSocket);
  var transport = new Transport(
      'NodeWebSocketTransport',
      streams.readableStream,
      streams.writableStream);
  var channel = new Channel('socketfs', 'socketfs', transport);
  var skeleton = new SkeletonFileSystem('nodefs', fileSystem, channel);
  skeleton.onClose.addListener(function(reason, value) {
    this.println('WebSocket file system closed');
    this.println('  reason: ' + reason);
    this.println('  value: ' + value);
  }.bind(this));
  streams.resume();
};

/*
 * A custom executable to expose the local node fs over stream transport.
 */
var socketfs = function(cx) {
  cx.ready();

  var port = cx.getArg('port');
  var fileSystem = cx.getArg('filesystem');
  var ssl = cx.getArg('ssl', false);
  var key = cx.getArg('key');
  var cert = cx.getArg('cert');
  if (!port || !fileSystem || cx.getArg('help')) {
    cx.stdout.write([
      'usage: socketfs <options>',
      'Run a WebSocket server to expose a local file system as a stream.',
      '',
      'Options:',
      '',
      '  -h, --help',
      '      Print this help message and exit.',
      '  -p, --port <port>',
      '      The WebSocket port to listen to.',
      '  -f, --filesystem <file-system-name>',
      '      The name of the filesystem to expose on WebSocket connections.',
      '  -s --ssl',
      '       Enable wss.',
      '  -c --cert <path>',
      '      Path to ssl cert file (default: cert.pem).',
      '  -k --key <path>',
      '      Path to ssl key file (default: key.pem).',
      '',
    ].join('\r\n') + '\r\n');

    cx.closeOk();
    return;
  }

  var options = {
    port: port,
    fileSystem: fileSystem,
    ssl: ssl,
    key: key,
    cert: cert
  };

  var server = new WebSocketFs(cx, options);
  server.run().then(
    function() {
      cx.closeOk();
    }
  ).catch(
    function(error) {
      cx.closeError(error);
    }
  );
};

socketfs.signature = {
    'help|h': '?',
    'port|p': '*',
    'filesystem|f': '$',
    'ssl|s': '?',
    'cert|c': '$',
    'key|k': '$',
    '_': '@'
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
    var cmds = {
      'socketfs': socketfs
    };
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
