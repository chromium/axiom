// Copyright (c) 2014 The Chromium Authors. All rights reserved.
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

    clean: ['out', 'dist'],

    chrome_app_manifest: {
      tot: {
        version: pkg.version,
        mode: 'tot',
        dest: 'out/chrome_app/manifest.json'
      },

      dev: {
        version: pkg.version,
        mode: 'dev',
        dest: 'out/chrome_app/manifest.json'
      }
    },

    copy: {
      chrome_app: {
        files: [
          { expand: true,
            cwd: 'chrome_app/',
            src: ['images/**/*.png'],
            dest: 'out/chrome_app/'
          },
          {
            expand: true,
            cwd: 'chrome_app/',
            src: ['html/**/*.html'],
            dest: 'out/chrome_app/'
          },
          {
            expand: true,
            cwd: 'boot/',
            src: ['amd_loader.js', 'chrome_app_background.js'],
            dest: 'out/chrome_app/js/'
          },
          { expand: true,
            cwd: 'node_modules/axiom/dist/amd/lib/',
            src: ['axiom_npm_deps.amd.js', 'axiom.amd.js'],
            dest: 'out/chrome_app/js/'
          },
          { expand: true,
            cwd: 'out/concat/lib',
            src: [pkg.name + '.amd.js'],
            dest: 'out/chrome_app/js/'
          }
        ]
      },

      dist: {
        files: [
          { expand: true,
            cwd: 'out/concat',
            src: ['lib/' + pkg.name + '.amd.js',
                  'lib/' + pkg.name + '.amd.min.js'],
            dest: 'dist/amd/'
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
      }
    },

    concat: {
      lib: {
        // Concatenate the AMD version of the transpiled source into a single
        // library.
        src: ['out/amd/lib/' + pkg.name + '/**/*.js'],
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
    },

    shell: {
      load_and_launch: {
        command: 'google-chrome-unstable ' +
            '--user-data-dir=./out/chrome-profile/ ' +
            '--load-and-launch-app=./out/chrome_app',
        options: {
          async: true
        }
      }
    }
  });

  grunt.registerTask('build', ['jshint', 'transpile', 'concat',
                               'uglify', 'copy:chrome_app']);
  grunt.registerTask('dist', ['build', 'copy:dist']);

  grunt.registerTask('reload_chrome_app',
                     ['build', 'chrome_app_manifest:tot',
                      'shell:load_and_launch']);

  grunt.registerTask('default', ['build']);
};
