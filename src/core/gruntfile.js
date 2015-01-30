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

  // Load global custom tasks.
  grunt.loadTasks('../grunt/');

  // Read in our own package file.
  var pkg = grunt.file.readJSON('./package.json');

  grunt.initConfig({
    pkg: pkg,
    env: process.env,

    clean: {
      all: ['bower_components', 'out', 'dist'],
      most: ['out'],
      transpile: ['out/amd', 'out/cjs'],
      polymer: ['out/polymer', 'dist/polymer'],
      polymer_lib: ['lib/polymer/axiom_vulcanized.html',
                    'lib/polymer/axiom_vulcanized.js']
    },

    'closure-compiler': {
      main: {
        cwd: 'lib/',
        js: 'axiom/**/*.js',
        jsOutputFile: 'out/closure/out.js',
        options: require('./build/closure-options.json')
      }
    },

    'watch': {
      shell: {
        files: ['lib/**/*.js',
                'lib/**/*.html',
                'lib/**/*.css',
                'node_modules/axiom/dist/**/*'],
        tasks: ['dist'],
      }
    },

    npm_adapt: {
      // This is a custom task defined in ./build/tasks/ which adapts simple
      // npm module to our module system.
      main: {
        files: [
          {
            cwd: 'out/amd/lib/npm/',
            src: 'node_modules/semver/semver.min.js',
            dest: 'semver.js'
          }
        ]
      }
    },

    copy: {
      dist: {
        files: [
          { expand: true,
            cwd: 'out/concat',
            src: ['lib/' + pkg.name + '.amd.js',
                  'lib/' + pkg.name + '.amd.min.js',
                  'lib/' + pkg.name + '_npm_deps.amd.js'],
            dest: 'dist/amd/'
          },
          { expand: true,
            cwd: 'out/cjs',
            src: ['lib/**/*.js'],
            dest: 'dist/cjs'
          },
          { expand: true,
            cwd: 'out/polymer',
            src: ['**'],
            dest: 'dist/polymer/'
          }
        ]
      },
      polymer_out: {
        files: [
          { expand: true,
            cwd: 'lib/polymer',
            src: ['axiom_vulcanized.html',
                  '*.js',
                  'bower_components/platform/platform.js',
                  'bower_components/platform/platform.js.map',
                  'bower_components/polymer/polymer.js',
                  'bower_components/polymer/polymer.js.map',
                  // Special case: splitter contains embedded url images.
                  'bower_components/core-splitter/handle.svg ',
                  'bower_components/core-splitter/handle-h.svg ',
                  ],
            dest: 'out/polymer/'
          }
        ]
      },
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
          src: ['axiom/**/*.js'],
          dest: 'out/amd/lib/'
        }]
      },
      cjs: {
        type: "cjs",
        // Defines the "root" directories used by the transpiler to resolve
        // import to files.
        fileResolver: [
          'lib/',
          'node_modules/semver/'
        ],
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['axiom/**/*.js'],
          dest: 'out/cjs/lib/'
        }]
      }
    },

    concat: {
      npm: {
        // Concatenate all of our npm deps into a single file.  (We only
        // have one dep right now.)
        src: ['out/amd/lib/npm/**/*.js'],
        dest: 'out/concat/lib/' + pkg.name + '_npm_deps.amd.js'
      },
      lib: {
        // Concatenate the AMD version of the transpiled source into a single
        // library.
        src: ['out/amd/lib/axiom.js', 'out/amd/lib/axiom/**/*.js'],
        dest: 'out/concat/lib/' + pkg.name + '.amd.js'
      }
    },

    // Linting.
    jshint: {
      lib: {
        src: 'lib/axiom/**/*.js',
        options: {
          jshintrc: '.jshintrc',
          force: false
        }
      }
    },

    // Minification.
    uglify: {
      lib: {
        src: ['out/concat/lib/' + pkg.name + '.amd.js'],
        dest: 'out/concat/lib/' + pkg.name + '.amd.min.js'
      },
    },

    // Bower package support:
    bower: {
      // Install bower components into top level 'bower_components'.
      install: {
        options: {
          // Download the files locally into 'bower_components'.
          install: true,
          // Keep the top level directory.
          cleanBowerDir: false,
          // Don't copy to the 'lib' directory (see 'sync' task below).
          copy: false,
        }
      },
    },

    sync: {
      // Sync top level 'bower_components' into 'lib/polymer' directory.
      // We need this task because the vulcanize task expects bower
      // components to be found relative to 'lib/polymer'.
      'bower_components': {
        files: [{
          cwd: 'bower_components/',
          src: ['**'],
          dest: 'lib/polymer/bower_components',
        }],
        // Display log messages when copying files
        //verbose: true,
        // Remove all files from dest that are not found in src
        updateAndDelete: true
      }
    },

    vulcanize: {
      default: {
        options: {
          csp: true
        },
        files: {
          /* Note: We generate in the "lib" directory because we want to have
           * url with relative paths starting at the current directory.
           * Another option would be to copy everything in "out" before
           * vulcanizing, but that would be alot of files to copy to merely
           * generate 2 output files. */
          'lib/polymer/axiom_vulcanized.html': ['lib/polymer/axiom.html']
        },
      }
    }
  });

  grunt.registerTask('build_polymer', ['bower:install', 'sync:bower_components',
                     'clean:polymer', 'vulcanize', 'copy:polymer_out',
                     'clean:polymer_lib']);
  grunt.registerTask('build', ['jshint', 'clean:transpile', 'es6_transpile',
                               'npm_adapt', 'build_polymer', 'concat',
                               'uglify']);
  grunt.registerTask('dist', ['build', 'copy:dist']);
  grunt.registerTask('default', ['build']);
};
