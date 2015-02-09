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

module.exports = function(grunt) {
  grunt.registerMultiTask('make_main_module', function() {
    var mainsrc = '';

    var files = grunt.file.expand(this.data, this.data.modules);
    files.forEach(function(file) {
      var moduleName = file.replace(/.js$/, '');
      mainsrc += this.data.require + '("' + moduleName + '");\n';
    }.bind(this));

    grunt.file.write(this.data.dest, mainsrc);
  });
};
