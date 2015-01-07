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

  // Read in our own package file.
  var pkg = grunt.file.readJSON('./package.json');

  grunt.initConfig({
    pkg: pkg,
    env: process.env,

    clean: {
      all: ['bower_components', 'out'],
      most: ['out'],
      transpile: ['out/amd']
    },

    watch: {
      shell: {
        files: ['lib/**/*.js',
                'lib/**/*.html',
                'lib/**/*.css',
                'html/**/*.js',
                'html/**/*.html',
                'html/**/*.css'],
        tasks: ['build'],
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

    copy: {
      html_out: {
        files: [
          {
            expand: true,
            cwd: 'html',
            src: ['*.html'],
            dest: 'out/'
          }, {
            expand: true,
            cwd: 'bower_components/ace-builds/src-noconflict',
            src: ['**'],
            dest: 'out/amd/lib/axiom_editor/ace/'
          }
        ]
      },
    },

    // Linting.
    jshint: {
      lib: {
        src: ['lib/**/*.js'],
        options: {
          jshintrc: '.jshintrc',
          force: false,
          verbose: true
        }
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
    }
  });

  grunt.registerTask('build', ['jshint', 'clean:transpile', 'transpile',
                               'bower:install', 'copy']);
  grunt.registerTask('default', ['build']);

  grunt.loadNpmTasks('grunt-contrib-watch');
};
