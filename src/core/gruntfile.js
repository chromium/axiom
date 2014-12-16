// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = function(grunt) {
  // Load the grunt related dev deps listed in package.json.
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // Load our custom tasks.
  grunt.loadTasks('./build/tasks/');

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
            src: ['axiom_vulcanized.html',
                  '*.js',
                  'bower_components/platform/platform.js',
                  'bower_components/platform/platform.js.map',
                  'bower_components/polymer/polymer.js',
                  'bower_components/polymer/polymer.js.map'],
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
                  'bower_components/polymer/polymer.js.map'],
            dest: 'out/polymer/'
          }
        ]
      },
    },

    // Convert our ES6 import/export keywords into plain js.  We generate an
    // AMD version for use in the browser, and a CommonJS version for use in
    // node.js.
    transpile: {
      amd: {
        type: "amd",
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['axiom/**/*.js'],
          dest: 'out/amd/lib/'
        }]
      },
      cjs: {
        type: "cjs",
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
  grunt.registerTask('build', ['jshint', 'clean:transpile', 'transpile',
                               'npm_adapt', 'build_polymer', 'concat',
                               'uglify']);
  grunt.registerTask('dist', ['build', 'copy:dist']);
  grunt.registerTask('default', ['build']);
};
