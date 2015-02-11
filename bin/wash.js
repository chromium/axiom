#!/usr/bin/env nodejs

if (!process.env.NODE_PATH) {
  console.log('Please set NODE_PATH to an absolute path to axiom/tmp/cjs/lib');
  process.exit(-1);
}

global.Promise = require('es6-promise').Promise;
require('es6-collections');

var JsFileSystem = require('axiom/fs/js/file_system').default;
var washExecutables = require('wash/exe_modules').dir;

var aliveInterval = setInterval(function() {}, 60 * 1000);

function startWash() {

}

function main() {
  var jsfs = new JsFileSystem();
  console.log('ready?');
  return jsfs.rootDirectory.mkdir('exe').then(function(jsdir) {
    console.log('go!: ' + jsdir + ', ' + washExecutables);
    jsdir.install(washExecutables);
    return startWash();
  }).catch(function(err) {
    console.log(err);
    throw err;
  });
}

main().then(function() {
  console.log('exit');
  clearTimeout(aliveInterval);
});
