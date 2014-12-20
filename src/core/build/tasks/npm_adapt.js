// Copyright 2014 Google Inc. All rights reserved.
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

/**
 * This adapts stand-alone npm modules to our AMD loader so we can depend on
 * them.
 *
 * We're using it for node-semver now, others TBD.
 *
 * This should become its own grunt-contrib-npm-adapt package so it can be
 * used in other projects.
 */

module.exports = function(grunt) {
  grunt.registerMultiTask
  ('npm_adapt',
   'Adapt a simple CommonJS module from the npm world to our AMD ' +
   'module system.  Works for stand-alone modules only.',
   function() {
     for (var i = 0; i < this.data.files.length; i++) {
       var file = this.data.files[i];
       var contents = grunt.file.read(file.src);

       grunt.file.write(
           file.cwd + '/' + file.dest,
           'define("' + file.dest.replace(/\.js$/, '') + '",["exports"],' +
                  'function(__exports__) {\n' +
                  'var exports = {}, module={exports: exports};\n' +
                   contents + '\n' +
                   '__exports__["default"] = module.exports;\n' +
                   'for (var _k in module.exports)\n' +
                   '  __exports__[_k] = module.exports[_k];\n' +
                   '});\n');
    }
  });
};
