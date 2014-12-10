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

    clean: {
      all: ['out'],
      transpile: ['out/amd']
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
        files: [{
          expand: true,
          cwd: 'html',
          src: ['*.html'],
          dest: 'out/'
        },
      ]},
      pnacl_out: {
        files: [{
          expand: true,
          cwd: 'pnacl',
          src: ['*'],
          dest: 'out/pnacl'
        },
      ]}
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

    'http-server-cors': {
      'axiom_pnacl': {
        // the server root directory
        root: 'out',
        port: 8283,
        host: "0.0.0.0",
        cache: -1, // in seconds (-1 = no caching)
        showDir: true,
        autoIndex: true,
        // server default file extension
        ext: "html",
        // Don't run in parallel with other tasks
        runInBackground: false,
        // Serve files from any origin
        cors: true
      }
    },

    'curl-dir': {
      'vim-pnacl': {
        src: [
          'http://gsdview.appspot.com/nativeclient-mirror/naclports/pepper_37/1338/publish/vim/pnacl/vim/{vim.nmf,vim.tar,vim_pnacl.pexe}'
        ],
        dest: 'out/pnacl'
      }
    }
  });

  grunt.registerTask('build', ['jshint', 'clean:transpile', 'transpile',
                               'copy', 'curl-dir:vim-pnacl']);
  grunt.registerTask('default', ['build']);
  grunt.registerTask('run', ['build', 'http-server-cors:axiom_pnacl']);
};
