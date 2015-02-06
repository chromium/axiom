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

module.exports = function(grunt) {
  // Load the grunt related dev deps listed in package.json.
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // Load our custom tasks.
  grunt.loadTasks('./build/tasks/');

  grunt.initConfig({
    clean: {
      all: ['tmp', 'dist', 'out']
    },

    'closure-compiler': {
      check: {
        cwd: 'lib/',
        js: ['axiom/core/*.js',
             'axiom/fs/*.js',
             'axiom/fs/base/*.js',
             'axiom/fs/js/*.js'],
        jsOutputFile: 'tmp/closure/out.js',
        options: require('./build/closure-options.json')
      }
    },

    'watch': {
      'check': {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js'],
        tasks: ['check']
      }
    },

    // Convert our ES6 import/export keywords into plain js.  We generate an
    // AMD version for use in the browser, and a CommonJS version for use in
    // node.js.
    es6_transpile: {
      amd: {
        type: "amd",
        // Defines the "root" directories used by the transpiler to resolve
        // import to files.
        fileResolver: [
          'lib/',
          'node_modules/semver/'
        ],
        files: [{
          expand: true,
          cwd: 'lib/',
          src: [
            'axiom/core/**/*.js',
            'axiom/fs/*.js'
        ],
          dest: 'out/amd/lib/'
        }]
      }
    },

    // Testing using Karma + Jasmine + Chrome
    karma: {
      unit: {
        options: {
          // Test framework used to write tests
          frameworks: ['jasmine'],
          // Where to look for source files to load.
          // (Order of entries is significant)
          files: [
            'test/fixtures/*.js',
            'out/amd/lib/**/*.js',
            'test/**/*.js'
          ],
          // Launch Chrome for running tests
          browsers: ['Chrome'],
        }
      }
    }
  });

  grunt.registerTask('check', ['closure-compiler:check']);
  grunt.registerTask('check-watch', ['watch']);
  grunt.registerTask('test', ['es6_transpile', 'karma:unit']);

};
