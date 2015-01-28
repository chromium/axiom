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
  var pnaclConfig = {
    baseUrl: 'http://gsdview.appspot.com/naclports/builds',
    // Note: With builds older than (approximately) pepper41/trunk-223-g26a4b66,
    // uncomment the tar downloading code in pnacl_commands.js.
    build: 'pepper_41/trunk-234-ge2927d4',
  };

  var globalConfig = {
    pnaclPublishUrl: pnaclConfig.baseUrl + '/' + pnaclConfig.build + "/publish",
    pnaclBuild: pnaclConfig.build,
  };

  // Load the grunt related dev deps listed in package.json.
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // Load global custom tasks.
  grunt.loadTasks('../../grunt/');

  // Load our custom tasks.
  grunt.loadTasks('./build/tasks/');

  // Read in our own package file.
  var pkg = grunt.file.readJSON('./package.json');

  grunt.initConfig({
    pkg: pkg,
    env: process.env,
    globalConfig: globalConfig,

    clean: {
      all: ['cache', 'out'],
      transpile: ['out/amd']
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
          'node_modules/axiom/lib/',
          'node_modules/shell/lib/'
      ],
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
          cwd: 'cache/pnacl/<%= globalConfig.pnaclBuild %>',
          src: ['**'],
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

  grunt.registerTask('build', ['jshint', 'clean:transpile', 'es6_transpile',
                               'if-missing:curl-dir:pnacl-binaries',
                               'sync:pnacl-binaries', 'copy']);
  grunt.registerTask('default', ['build']);
  grunt.registerTask('run', ['build', 'http-server-cors:axiom_pnacl']);
};
