// Copyright 2015 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/*
 * Update grunt-es6-module-transpiler to support e6-module-transpiler v0.5+
 * and amd formatter.
 */

'use strict';

module.exports = function(grunt) {
  var path = require('path');

  function transpile(file, options) {
    var src = file.src;
    var ext = path.extname(src);

    // module name = 'cwd' option + base file name
    var moduleName = path
        .join(path.dirname(src), path.basename(src, ext))
        .replace(/[\\]/g, '/');  // Deal with Windows separators.
    if (file.orig.cwd) {
      moduleName = moduleName.slice(file.orig.cwd.length);
    }

    var transpiler = require('es6-module-transpiler');

    // Figure out formatter to use according to options. "AMD" requires an
    // additional module.
    var formatter;
    switch(options.type){
    case 'cjs':
      formatter = transpiler.formatters.commonjs;
      break;
    case 'amd':
      var AMDFormatter = require('es6-module-transpiler-amd-formatter');
      formatter = new AMDFormatter();
      break;
    default:
      throw new Error("unknown transpile destination type: " + options.type);
    }

    // Create a container with the file resolvers and formatter, find the module
    // name and write it to disk.
    var container = new transpiler.Container({
      resolvers: [new transpiler.FileResolver(options.fileResolver)],
      formatter: formatter
    });
    container.getModule(moduleName);
    container.write(file.dest);
  }

  grunt.registerMultiTask("es6_transpile", function(){
    var opts = {};
    opts.fileResolver = this.data.fileResolver;
    opts.type = this.data.type;
    opts.moduleName = this.data.moduleName;

    // Transpile one file at a time.
    this.files.forEach(function(file){
      file.src.filter(function(path){
        if(!grunt.file.exists(path)){
          grunt.log.warn('Source file "' + path + '" not found.');
          return false;
        } else {
          return true;
        }
      }).forEach(function(path){
        try {
          transpile({src:path, dest:file.dest, orig:file.orig}, opts);
        } catch (e) {
          grunt.log.error(e);
          grunt.fail.warn('Error compiling ' + path);
        }
      });
    });
  });
};