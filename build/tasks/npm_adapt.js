// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This adapts stand-alone npm modules to our AMD loader so we can depend on
 * them.
 *
 * We're using it for node-semver now, others TBD.
 *
 * This should become its own grunt-contrib-npm-adapt package so it can be
 * used in other projects.
 */

module.exports = function(grunt) {
  grunt.registerMultiTask
  ('npm_adapt',
   'Adapt a simple CommonJS module from the npm world to our AMD ' +
   'module system.  Works for stand-alone modules only.',
   function() {
     for (var i = 0; i < this.data.files.length; i++) {
       var file = this.data.files[i];
       var contents = grunt.file.read(file.src);

       grunt.file.write(
           file.cwd + '/' + file.dest,
           'define("' + file.dest.replace(/\.js$/, '') + '",["exports"],' +
                  'function(__exports__) {\n' +
                  'var exports = {}, module={exports: exports};\n' +
                   contents + '\n' +
                   '__exports__["default"] = module.exports;\n' +
                   'for (var _k in module.exports)\n' +
                   '  __exports__[k] = module.exports[_k];\n' +
                   '});\n');
    }
  });
};
