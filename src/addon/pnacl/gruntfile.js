// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = function(grunt) {
  var pnaclConfig = {
    base: 'http://gsdview.appspot.com/naclports/builds',
    vpath: 'pepper_39/1598-17315b6',
  };

  var globalConfig = {
    pnaclBaseUrl: pnaclConfig.base + '/' + pnaclConfig.vpath + "/publish",
  };

  // Load the grunt related dev deps listed in package.json.
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // Load our custom tasks.
  grunt.loadTasks('./build/tasks/');

  // Read in our own package file.
  var pkg = grunt.file.readJSON('./package.json');

  grunt.initConfig({
    pkg: pkg,
    env: process.env,
    globalConfig: globalConfig,

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
      'pnacl-binaries': {
        src: [
          '<%= globalConfig.pnaclBaseUrl %>/curl/pnacl/{curl.nmf,curl_ppapi_pnacl.pexe}',
          '<%= globalConfig.pnaclBaseUrl %>/nano/pnacl/{nano.nmf,nano.tar,nano_pnacl.pexe}',
          '<%= globalConfig.pnaclBaseUrl %>/nethack/pnacl/nethack/{nethack.nmf,nethack.tar,nethack_pnacl.pexe}',
          '<%= globalConfig.pnaclBaseUrl %>/python/pnacl/{python.nmf,python.pexe,pydata_pnacl.tar}',
          '<%= globalConfig.pnaclBaseUrl %>/unzip/pnacl/{unzip.nmf,unzip_pnacl.pexe}',
          '<%= globalConfig.pnaclBaseUrl %>/vim/pnacl/vim/{vim.nmf,vim.tar,vim_pnacl.pexe}',
        ],
        dest: 'out/pnacl'
      }
    }
  });

  grunt.registerTask('build', ['jshint', 'clean:transpile', 'transpile',
                               'copy', 'curl-dir:pnacl-binaries']);
  grunt.registerTask('default', ['build']);
  grunt.registerTask('run', ['build', 'http-server-cors:axiom_pnacl']);
};
