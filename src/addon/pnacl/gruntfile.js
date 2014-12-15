// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = function(grunt) {
  var pnaclConfig = {
    baseUrl: 'http://gsdview.appspot.com/naclports/builds',
    build: 'pepper_39/1598-17315b6',
  };

  var globalConfig = {
    pnaclPublishUrl: pnaclConfig.baseUrl + '/' + pnaclConfig.build + "/publish",
    pnaclBuild: pnaclConfig.build,
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
      // Copy pnacl build to a local cache directory (one time only)
      'pnacl-binaries': {
        src: [
          '<%= globalConfig.pnaclPublishUrl %>/curl/pnacl/{curl.nmf,curl_ppapi_pnacl.pexe}',
          '<%= globalConfig.pnaclPublishUrl %>/nano/pnacl/{nano.nmf,nano.tar,nano_pnacl.pexe}',
          '<%= globalConfig.pnaclPublishUrl %>/nethack/pnacl/nethack/{nethack.nmf,nethack.tar,nethack_pnacl.pexe}',
          '<%= globalConfig.pnaclPublishUrl %>/python/pnacl/{python.nmf,python.pexe,pydata_pnacl.tar}',
          '<%= globalConfig.pnaclPublishUrl %>/unzip/pnacl/{unzip.nmf,unzip_pnacl.pexe}',
          '<%= globalConfig.pnaclPublishUrl %>/vim/pnacl/vim/{vim.nmf,vim.tar,vim_pnacl.pexe}',
        ],
        dest: 'cache/pnacl/<%= globalConfig.pnaclBuild %>'
      }
    },

    sync: {
      // Sync the pnacl local cache with the "out" directory
      'pnacl-binaries': {
        files: [{
          src: ['cache/pnacl/<%= globalConfig.pnaclBuild %>/**'],
          dest: 'out/pnacl',
        }],
        // Display log messages when copying files
        verbose: true,
        // Remove all files from dest that are not found in src
        updateAndDelete: true
      }
    },


    'watch': {
      sources: {
        files: ['lib/**/*.js',
                'lib/**/*.html'],
        tasks: ['build'],
      }
    },

  });

  grunt.registerTask('build', ['jshint', 'clean:transpile', 'transpile',
                               'if-missing:curl-dir:pnacl-binaries',
                               'sync:pnacl-binaries', 'copy']);
  grunt.registerTask('default', ['build']);
  grunt.registerTask('run', ['build', 'http-server-cors:axiom_pnacl']);
};
