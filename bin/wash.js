#!/usr/bin/env nodejs

if (!process.env.NODE_PATH) {
  console.log('Please set NODE_PATH to an absolute path to axiom/tmp/cjs/lib');
  process.exit(-1);
}

global.Promise = require('es6-promise').Promise;
require('es6-collections');

var JsFileSystem = require('axiom/fs/js/file_system.js').default;
var washExecutables = require('wash/exe_modules').default;

function main() {
  var jsfs = new JsFileSystem();
  jsfs.mkdir('exe').then(function(jsdir) {
    jsdir.install(washExecutables);
    console.log(jsfs);
  });
}

main();
