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
  var path = require('path');

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
        js: ['**/*.js',
             '../third_party/closure-compiler/contrib/externs/jasmine.js',
             '../tmp/third_party/dcodeIO/fs.js',
             '../tmp/third_party/dcodeIO/buffer.js',
             '../tmp/third_party/dcodeIO/stream.js',
             '../tmp/third_party/dcodeIO/events.js'
            ],
        jsOutputFile: 'tmp/closure/out.js',
        options: require('./build/closure-options.json')
      }
    },

    git_deploy: {
      samples: {
        options: {
          url: 'git@github.com:chromium/axiom.git'
        },
        src: 'tmp/samples'
      },
    },

    make_dir_module: {
      wash: {
        strip: 2,
        dest: 'lib/wash/exe_modules.js',
        cwd: 'lib',
        modules: ['wash/exe/*.js']
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

    closure_externs: {
      build: {
        expand: true,
        src: ['**/*.js'],
        dest: 'tmp/third_party/dcodeIO/',
        cwd: 'third_party/dcodeIO/',
      }
    },

    make_package_json: {
      make: { 
        options: {
          versionSource: 'package.json'
        },
        files: {
          'dist/axiom_base/package.json': 'lib/axiom/package_dist.json',
          'dist/axiom_wash/package.json': 'lib/wash/package_dist.json'
        }
      }
    },

    concat: {
      axiom_base: {
        src: ['loader/axiom_amd.js',
              'tmp/amd/lib/axiom/**/*.js',
              '!tmp/amd/lib/axiom/fs/node/*.js',
              '!tmp/amd/lib/axiom/**/*.test.js'],
        dest: 'dist/axiom_base/amd/lib/axiom_base.amd.concat.js'
      },
      wash: {
        src: ['tmp/amd/lib/wash/**/*.js',
              '!tmp/amd/lib/wash/**/*.test.js'],
        dest: 'dist/axiom_wash/amd/lib/wash.amd.concat.js'
      }
    },

    copy: {
      axiom_dist: {
        files: [
          {expand: true, cwd: 'tmp/cjs/', src: ['lib/axiom/**/*.js',
              'lib/axiom/**/*.js.map'], dest: 'dist/axiom_base/cjs'},
          {expand: true, cwd: 'tmp/amd/', src: ['lib/axiom/**/*.js'],
              dest: 'dist/axiom_base/amd'},
          {expand: true, cwd: '', src: ['lib/axiom/**/*.js',
              '!package_dist.json'], dest: 'dist/axiom_base/es6'}
        ]
      },
      wash_dist: {
        files: [
          {expand: true, cwd: 'tmp/cjs/', src: ['lib/wash/**/*.js',
              'lib/wash/**/*.js.map'], dest: 'dist/axiom_wash/cjs'},
          {expand: true, cwd: 'tmp/amd/', src: ['lib/wash/**/*.js'],
              dest: 'dist/axiom_wash/amd'},
          {expand: true, cwd: '', src: ['lib/wash/**/*.js',
              '!package_dist.json'], dest: 'dist/axiom_wash/es6'}
        ]
      },
      samples_web_shell_files: {
        files: [{
          expand: true,
          cwd: 'dist/axiom_base/amd/lib/',
          src: ['*.js', '*.map'],
          dest: 'tmp/samples/web_shell/js/'
        },
        {
          expand: true,
          cwd: 'dist/axiom_wash/amd/lib/',
          src: ['*.js'],
          dest: 'tmp/samples/web_shell/js/'
        },
        {
          expand: true,
          cwd: 'node_modules/hterm/dist/amd/lib/',
          src: ['hterm.amd.js'],
          dest: 'tmp/samples/web_shell/js/'
        },
        {
          expand: true,
          cwd: 'samples/scripts/',
          src: ['**/*.js',
                '**/*.js.map',
                '**/*.html'
          ],
          dest: 'tmp/samples/scripts'
        },
        {
          expand: true,
          cwd: 'samples/editor/',
          src: ['**/*.js',
                '**/*.js.map',
                '**/*.html'
          ],
          dest: 'tmp/samples/editor'
        },
        {
          expand: true,
          cwd: '',
          src: ['acejs/**'],
          dest: 'tmp/samples/editor/js'
        },
        {
          expand: true,
          cwd: 'samples/web_shell/boot/',
          src: ['**/*.js',
                '**/*.js.map'
          ],
          dest: 'tmp/samples/web_shell/js/boot'
        },
        {
          expand: true,
          cwd: 'samples/web_shell/css/',
          src: ['**/*.css'],
          dest: 'tmp/samples/web_shell/css'
        }]
      },
      samples_use_globals_files: {
        files: [{
          expand: true,
          cwd: 'tmp/dist/',
          src: ['**/*.js'],
          dest: 'tmp/samples/use_globals/js/'
        },
        {
          expand: true,
          cwd: 'samples/use_globals/css/',
          src: ['**/*.css'],
          dest: 'tmp/samples/use_globals/css'
        },
        {
          expand: true,
          cwd: 'samples/use_globals/',
          src: ['**/*.html'],
          dest: 'tmp/samples/use_globals/'
        }]
      },
      samples_landing_files: {
        files: [{
          expand: true,
          cwd: 'samples/landing',
          src: ['**'],
          dest: 'tmp/samples'
        }]
      }
    },

    make_html_index: {
      samples_web_shell: {
        dest: 'tmp/samples/web_shell/index.html',
        title: 'Console',
        cwd: 'tmp/samples/web_shell/',
        scriptrefs: [
          'js/axiom_base.amd.concat.js',
          'js/wash.amd.concat.js',
          'js/*.js',
          'js/shell/**/*.js',
          'js/boot/startup.js' // last entry since we are synchronous (for now)
        ],
        cssrefs: [
          'css/**/*.css'
        ]
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
      samples: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js', 'samples/**/*.js'],
        tasks: ['check', 'samples']
      },
      check_test: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js', 'test/**/*.js'],
        tasks: ['check', 'transpile', 'make_main_module:test', 'karma:once']
      },
      samples: {
        options: {
          atBegin: true,
          livereload: true
        },
        files: ['gruntfile.js', 'lib/**/*.js', 'samples/**/*.js', 'samples/**/*.html'],
        tasks: ['check', 'samples']
      },
      just_samples: {
        options: {
          atBegin: true,
          livereload: true
        },
        files: ['samples/**/*.js', 'samples/**/*.html'],
        tasks: ['samples_no_transpile']
      }

    },

    es6_transpile: {
      amd: {
        type: "amd",
        fileResolver: ['lib/'],
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
          dest: 'tmp/amd/lib/'
        }]
      },

      cjs: {
        type: "cjs",
        fileResolver: ['lib/'],
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
          dest: 'tmp/cjs/lib/'
        }]
      },
      samples_web_shell: {
        type: "amd",
        fileResolver: ['lib/',
                       'node_modules/hterm/dist/stub/',
                       'node_modules/hterm/dist/stub/',
                       'samples/web_shell/lib'],
        files: [{
          expand: true,
          cwd: 'samples/web_shell/lib/',
          src: ['**/*.js'],
          dest: 'tmp/samples/web_shell/js/'
        }]
      }
    },

    shell: {
      axiom: {
        command: function() {
          'npm publish ' + path.join('dist', 'axiom_base');
        }
      },
      wash: {
        command: function() {
          'npm publish ' + path.join('dist', 'axiom_wash');
        }
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
      },
      server: {
        singleRun: false
      }
    },

    run_wash: {
      main: {}
    }
  });

  // Just transpile.
  grunt.registerTask('transpile', ['clean',
                                   'make_dir_module',
                                   'es6_transpile']);

  // Static check with closure compiler.
  grunt.registerTask('check', ['make_dir_module',
                               'closure_externs:build',
                               'closure-compiler:check']);
  grunt.registerTask('check-watch', ['watch:check']);

  grunt.registerTask('dist', ['transpile',
                              'concat:axiom_base',
                              'concat:wash',
                              'copy:axiom_dist',
                              'copy:wash_dist',
                              'make_package_json']);

  // Transpile and test.
  grunt.registerTask('test', ['transpile',
                              'make_main_module:test',
                              'karma:once']);
  grunt.registerTask('test-watch', ['clean',
                                    'watch:test']);

  // Static check, transpile, test, repeat on changes.
  grunt.registerTask('check-test-watch', ['clean', 'watch:check_test']);

  // Build, then run wash from node.js
  grunt.registerTask('wash', ['clean', 'make_dir_module', 'es6_transpile:cjs',
                              'run_wash']);

  grunt.registerTask('default', ['check', 'test']);

  // Sample apps
  grunt.registerTask('samples_web_shell',
                     ['copy:samples_web_shell_files',
                      'make_html_index:samples_web_shell']);

  grunt.registerTask('samples_no_transpile', ['copy:samples_landing_files',
                                 'samples_web_shell',
                                 'copy:samples_use_globals_files']);

  grunt.registerTask('samples', ['dist', 'samples_no_transpile']);

  grunt.registerTask('deploy_samples', ['samples', 'git_deploy:samples']);

  grunt.registerTask('npm-publish', ['shell:axiom', 'shell:wash']);
};
