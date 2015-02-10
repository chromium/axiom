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
    browsers = ['PhantomJS'];
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
             'axiom/fs/js/*.js',
             '../third_party/closure-compiler/contrib/externs/jasmine.js'
            ],
        jsOutputFile: 'tmp/closure/out.js',
        options: require('./build/closure-options.json')
      }
    },

    make_main_module: {
      test: {
        require: '__axiomRequire__',
        dest: 'tmp/test/test_main.js',
        cwd: 'lib/',
        modules: ['**/*.test.js']
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
        tasks: ['transpile', 'make_main_module:test', 'karma:once']
      },
      check_test: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js', 'test/**/*.js'],
        tasks: ['check', 'transpile', 'make_main_module:test', 'karma:once']
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
            'axiom/fs/**/*.js'
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
          'node_modules/es6-collections/index.js',
          'node_modules/es6-promise/dist/es6-promise.js',
          'polyfill/promise.js',
          'polyfill/bind.js',
          'loader/axiom_amd.js',
          'tmp/amd/lib/**/*.js',
          'tmp/test/test_main.js',
        ]
      },
      once: {
        singleRun: true
      }
    }
  });

  // Just transpile.
  grunt.registerTask('transpile', ['clean', 'es6_transpile']);

  // Static check with closure compiler.
  grunt.registerTask('check', ['closure-compiler:check']);
  grunt.registerTask('check-watch', ['watch:check']);

  // Transpile and test.
  grunt.registerTask('test', ['clean',
                              'es6_transpile',
                              'make_main_module:test',
                              'karma:once']);
  grunt.registerTask('test-watch', ['clean',
                                    'watch:test']);

  // Static check, transpile, test, repeat on changes.
  grunt.registerTask('check-test-watch', ['clean', 'watch:check_test']);

  grunt.registerTask('default', ['check', 'test']);
};
