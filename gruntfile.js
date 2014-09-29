// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
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

    clean: ['out'],

    npm_adapt: {
      // This is a custom task defined in ./build/tasks/ which adapts simple
      // npm module to our module system.
      main: {
        files: [
          {
            cwd: 'out/amd/lib/npm/',
            src: 'node_modules/semver/semver.js',
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
                  'lib/' + pkg.name + '.amd.min.js'],
            dest: 'dist/'
          }
        ]
      }
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
          src: ['**/*.js'],
          dest: 'out/amd/lib/'
        }]
      },
      cjs: {
        type: "cjs",
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
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
        src: 'lib/**/*.js',
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
    }
  });

  grunt.registerTask('build', ['jshint', 'transpile', 'npm_adapt', 'concat',
                               'uglify']);
  grunt.registerTask('dist', ['build', 'copy:dist']);
  grunt.registerTask('default', ['build']);
};
