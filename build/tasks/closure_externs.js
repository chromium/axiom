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

// Makes a new js file which loads a list of modules using the supplied
// require function.

// This is temporary hack to make closure happy. Going forward we will need
// first class support from closure for such cases.
module.exports = function(grunt) {
  var moduleNames = [];
  var contents = [];
  grunt.registerMultiTask('closure_externs', function() {
    // Run over all externs files and collect all module names. Replace
    // all occurences of the module name in the file they are defined.
    this.files.forEach(function(file) {
      var content = grunt.file.read(file.src);
      var pattern = /var ([$a-zA-z_-]*) = {}/;
      var moduleName = pattern.exec(content)[1];

      moduleNames.push(moduleName);

      var re = new RegExp(moduleName + '([\.,\\s+])', "g");
      content = content.replace(re, 't_node_' + moduleName +'$1');
      contents.push(content);
    }.bind(this));

    // A second pass over files replacing all the collected modules in the file.
    for (var j = 0; j < this.files.length; ++j) {
      var content = contents[j];
      for (var i = 0; i < moduleNames.length; ++i) {
        // Avoid double replacement.
        if (i == j) {
          continue;
        }
        // Replace all occurence of moduleName[,.\s] ==> t_node_moduleName[,.\s].
        // This avoids replacing any variables prefixed with module name.
        // TODO(grv): Don't replace when the moduleName is the suffix of
        // a variable name.
        var re = new RegExp(moduleNames[i] + '([\.,\\s+])', "g");
        content = content.replace(re, 't_node_' + moduleNames[i] + '$1');
      }
      grunt.file.write(this.files[j].dest, content);
    }
  });
};
