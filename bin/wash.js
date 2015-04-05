#!/usr/bin/env nodejs

if (!process.env.NODE_PATH) {
  console.log('Please set NODE_PATH to an absolute /path/to/axiom/tmp/cjs/lib');
  process.exit(-1);
}

global.Promise = require('es6-promise').Promise;

require('source-map-support').install();

var AxiomError = require('axiom/core/error').default;
var Path = require('axiom/fs/path').default;
var FileSystemManager = require('axiom/fs/base/file_system_manager').default;
var StdioSource = require('axiom/fs/stdio_source').default;
var JsFileSystem = require('axiom/fs/js/file_system').default;
var NodeFileSystem = require('axiom/fs/node/file_system').default;
var TTYState = require('axiom/fs/tty_state').default;
var washExecutables = require('wash/exe_modules').dir;

if ('setRawMode' in process.stdin) {
  // Stdin seems to be missing setRawMode under grunt.
  process.stdin.setRawMode(true);
}

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
