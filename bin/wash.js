#!/usr/bin/env nodejs

if (!process.env.NODE_PATH) {
  console.log('Please set NODE_PATH to an absolute path to axiom/tmp/cjs/lib');
  process.exit(-1);
}

global.Promise = require('es6-promise').Promise;

var JsFileSystem = require('axiom/fs/js/file_system').default;
var washExecutables = require('wash/exe_modules').dir;

var aliveInterval = setInterval(function() {}, 60 * 1000);

var fs = require('fs');
var rawout = new fs.SyncWriteStream(1, {autoclose: false});
var rawerr = new fs.SyncWriteStream(2, {autoclose: false});

function startWash(jsfs) {
  return jsfs.createExecuteContext('/exe/wash', {}).then(
    function(cx) {
      cx.onStdOut.addListener(function(value) {
        rawout.write(value);
      });

      cx.onStdErr.addListener(function(value) {
        rawerr.write(value);
      });

      cx.onReady.addListener(function(value) {
        console.log('wash ready');
      });

      cx.onClose.addListener(function(reason, value) {
        console.log('wash closed: ' + reason + ', ' + value);
      });

      console.log('starting wash');
      cx.setEnv('@PATH', ['/exe']);
      return cx.execute();
    });
}

function main() {
  var jsfs = new JsFileSystem();
  return jsfs.rootDirectory.mkdir('exe').then(function(jsdir) {
    jsdir.install(washExecutables);
    return startWash(jsfs);
  });
}

main().then(function(value) {
  console.log('exit:', value);
  clearTimeout(aliveInterval);
}).catch(function(err) {
  console.log('Uncaught exception:', err);
  clearTimeout(aliveInterval);
});
