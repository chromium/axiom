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

  // Load our custom tasks.
  grunt.loadTasks('./build/tasks/');

  // Read in our own package file.
  var pkg = grunt.file.readJSON('./package.json');

  grunt.initConfig({
    pkg: pkg,
    env: process.env,

    clean: {
      all: ['out', 'dist'],
      most: ['out/*', '!out/chrome-profile'],
      transpile: ['out/amd', 'out/cjs']
    },

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

    npm_adapt: {
      // This is a custom task defined in ./build/tasks/ which adapts simple
      // npm module to our module system.
      main: {
        files: [
          {
            cwd: 'out/amd/lib/npm/',
            src: 'node_modules/minimist/index.js',
            dest: 'minimist.js'
          }
        ]
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
          { expand: true,
            cwd: 'chrome_app/',
            src: ['html/**/*.html'],
            dest: 'out/chrome_app/'
          },
          // Copy application polymer elements
          { expand: true,
            cwd: 'lib/',
            src: ['polymer/**/*.html', 'polymer/**/*.css', 'polymer/**/*.js'],
            dest: 'out/chrome_app/'
          },
          { expand: true,
            cwd: 'boot/',
            src: ['amd_loader.js',
                  'chrome_app_background.js'],
            dest: 'out/chrome_app/js/'
          },
          { expand: true,
            cwd: 'node_modules/axiom/dist/amd/lib/',
            src: ['axiom_npm_deps.amd.js', 'axiom.amd.js'],
            dest: 'out/chrome_app/js/'
          },
          { expand: true,
            cwd: 'node_modules/hterm/dist/amd/lib/',
            src: ['hterm.amd.min.js'],
            dest: 'out/chrome_app/js/'
          },
          { expand: true,
            cwd: 'node_modules/axiom/dist/polymer/',
            src: ['**/*'],
            dest: 'out/chrome_app/polymer/'
          },
          { expand: true,
            cwd: 'out/concat/lib',
            src: [pkg.name + '.amd.js'],
            dest: 'out/chrome_app/js/'
          },
          { expand: true,
            cwd: 'out/concat/lib',
            src: [pkg.name + '_npm_deps.amd.js'],
            dest: 'out/chrome_app/js/'
          }
        ]
      },

      web_app: {
        files: [
          { expand: true,
            cwd: 'web_app/',
            src: ['images/**/*.png'],
            dest: 'out/web_app/'
          },
          { expand: true,
            cwd: 'web_app/',
            src: ['**/*.html'],
            dest: 'out/web_app/'
          },
          // Copy application polymer elements
          { expand: true,
            cwd: 'lib/',
            src: ['polymer/**/*.html', 'polymer/**/*.css', 'polymer/**/*.js'],
            dest: 'out/web_app/'
          },
          { expand: true,
            cwd: 'boot/',
            src: ['amd_loader.js', 'web_app_startup.js'],
            dest: 'out/web_app/js/'
          },
          // Copy JavaScript files from "axiom"
          {
            expand: true,
            cwd: 'node_modules/axiom/dist/amd/lib/',
            src: ['axiom_npm_deps.amd.js', 'axiom.amd.js'],
            dest: 'out/web_app/js/'
          },
          { expand: true,
            cwd: 'node_modules/hterm/dist/amd/lib/',
            src: ['hterm.amd.min.js'],
            dest: 'out/web_app/js/'
          },
          // Copy all "polymer" component files from "axiom"
          { expand: true,
            cwd: 'node_modules/axiom/dist/polymer/',
            src: ['**/*'],
            dest: 'out/web_app/polymer/'
          },
          // Copy JavaScript files for axiom-shell
          { expand: true,
            cwd: 'out/concat/lib',
            src: [pkg.name + '.amd.js'],
            dest: 'out/web_app/js/'
          },
          { expand: true,
            cwd: 'out/concat/lib',
            src: [pkg.name + '_npm_deps.amd.js'],
            dest: 'out/web_app/js/'
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
    es6_transpile: {
      amd: {
        type: "amd",
        // Defines the "root" directories used by the transpiler to resolve
        // import to files.
        fileResolver: [
          'lib/',
          'node_modules/axiom/lib/',
          'out/amd/lib/npm',
          'node_modules/hterm/dist/cjs/lib/'],
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
          dest: 'out/amd/lib/'
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
        src: ['out/amd/lib/' + pkg.name + '/**/*.js'],
        dest: 'out/concat/lib/' + pkg.name + '.amd.js'
      }
    },

    // Linting.
    jshint: {
      lib: {
        src: 'lib/' + pkg.name + '/**/*.js',
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
    },

    'http-server': {
      'web_app': {
        // the server root directory
        root: 'out/web_app',
        port: 8282,
        host: "0.0.0.0",
        cache: 1, // in seconds
        showDir : true,
        autoIndex: true,
        // server default file extension
        ext: "html",
        // Don't run in parallel with other tasks
        runInBackground: false
      }
    },

    'watch': {
      shell: {
        files: ['lib/**/*.js',
                'lib/**/*.html',
                'web_app/**/*.html',
                'boot/**/*.js',
                'node_modules/axiom/dist/**/*'],
        tasks: ['build'],
      }
    }
  });

  grunt.registerTask('build', ['jshint', 'clean:transpile', 'npm_adapt',
                               'es6_transpile', 'concat', 'uglify',
                               'copy:chrome_app', 'copy:web_app']);
  grunt.registerTask('dist', ['build', 'copy:dist']);

  grunt.registerTask('reload_chrome_app',
                     ['build', 'chrome_app_manifest:tot',
                      'shell:load_and_launch']);

  grunt.registerTask('run_web_app',
                     ['build', 'http-server:web_app']);

  grunt.registerTask('default', ['build']);
};
