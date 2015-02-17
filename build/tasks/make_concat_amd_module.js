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

// Makes a new js file which contains a list of modules surrounded
// by a "init" function.
//
//   function __initAxiom__(opt_define) {
//     var define = opt_define || ...our loader...;
//     ...all amd modules...
//     if (!opt_define)
//       return __axiomRequire('axiom').default;
//   };
//   var axiom = __initAxiom__(define);
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

    var initName = this.data.init;
    var requireName = this.data.require;
    var mainsrc = '';

    // Function header
    mainsrc += 'function ' + initName + '(opt_define) {\n';
    mainsrc += '  var define = opt_define;\n';
    mainsrc += '  if (!define) {\n';
    var loaderContents = grunt.file.read(this.data.loader);
    mainsrc += indentSource(loaderContents, "    ");
    mainsrc += '\n';
    mainsrc += '  }\n';

    // Append source contents of all modules
    var files = grunt.file.expand(this.data, this.data.modules);
    files.forEach(function(file) {
      var moduleContents = grunt.file.read(path.join(this.data.cwd, file));
      var moduleName = file.replace(/.js$/, '');
      mainsrc += indentSource(moduleContents, "  ");
      mainsrc += '\n';
    }.bind(this));


    // Function footer
    mainsrc += '  if (!opt_define)\n';
    mainsrc += '    return ' + requireName + '(\'axiom\').default\n';
    mainsrc += '};  /* ' + initName + ' */\n';

    // Define global "axiom" variable
    mainsrc += 'var axiom = ' + initName + '(define);\n';
    grunt.file.write(this.data.dest, mainsrc);
  });
};
