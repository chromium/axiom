// Copyright (c) 2015 Google Inc. All rights reserved.
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

// Makes a new js file which starts with an optional loader and contains a 
// list of modules surrounded by a "init" function.
//
//   ...optional loader code here...
//   (function() {
//     ...all amd modules...
//   })();
//

module.exports = function(grunt) {
  var path = require('path');

  function indentSource(contents, indent) {
    var lines = contents.split('\n');
    var src = '';
    for (i in lines) {
      var line = lines[i];
      if (line.length >= 1 && line[line.length - 1] == '\r') {
        line = line.substr(0, line.length - 1);
      }
      if (line.length == 0)
        src += '\n';
      else
        src += indent + line + '\n';
    }
    return src;
  }

  grunt.registerMultiTask('make_concat_amd_module', function() {

    var mainsrc = '';

    // Loader
    if (this.data.loader) {
      var loaderContents = grunt.file.read(this.data.loader);
      mainsrc += loaderContents += '\n';
    }

    // 
    mainsrc += '(function() {\n';
    // Append source contents of all modules
    var moduleNameList = [];
    var files = grunt.file.expand(this.data, this.data.modules);
    files.forEach(function(file) {
      var moduleContents = grunt.file.read(path.join(this.data.cwd, file));
      var moduleName = file.replace(/.js$/, '');
      moduleNameList.push(moduleName);
      mainsrc += indentSource(moduleContents, "  ");
      mainsrc += '\n';
    }.bind(this));

    mainsrc += '})();\n';

    grunt.file.write(this.data.dest, mainsrc);
  });
};
