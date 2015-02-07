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

  var browsers = grunt.option('browsers');
  if (browsers) {
    browsers = browsers.split(/\s*,\s*/g);
  } else {
    browsers = ['Chrome'];
  }

  grunt.initConfig({
    clean: {
      all: ['tmp', 'dist']
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

    watch: {
      check: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js'],
        tasks: ['check']
      },
      test: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js', 'test/**/*.js'],
        tasks: ['es6_transpile', 'karma:once']
      },
      check_test: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js', 'test/**/*.js'],
        tasks: ['check', 'es6_transpile', 'karma:once']
      }
    },

    es6_transpile: {
      amd: {
        type: "amd",
        // Defines the "root" directories used by the transpiler to resolve
        // import to files.
        fileResolver: ['lib/'],
        files: [{
          expand: true,
          cwd: 'lib/',
          src: [
            'axiom/core/**/*.js',
            'axiom/fs/*.js'
          ],
          dest: 'tmp/amd/lib/'
        }]
      }
    },

    karma: {
      options: {
        browsers: browsers,
        frameworks: ['jasmine'],
        files: [
          'test/fixtures/*.js',
          'tmp/amd/lib/**/*.js',
          'test/**/*.js'
        ]
      },
      once: {
        singleRun: true
      }
    }
  });

  grunt.registerTask('check', ['closure-compiler:check']);
  grunt.registerTask('check-watch', ['watch:check']);

  grunt.registerTask('test', ['es6_transpile', 'karma:once']);
  grunt.registerTask('test-watch', ['watch:test']);

  grunt.registerTask('check-test-watch', ['watch:check_test']);
};
