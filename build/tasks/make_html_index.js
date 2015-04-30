// Copyright (c) 2015 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Makes a new html file which loads a list of js files.

module.exports = function(grunt) {
  grunt.registerMultiTask('make_html_index', function() {

    var mainsrc = '<!DOCTYPE html>\n';
    mainsrc += '<html>\n';
    mainsrc += '<head>\n';
    mainsrc += '  <title>' + this.data.title + '</title>\n';

    if (this.data.cssrefs) {
      var cssrefs = grunt.file.expand(this.data, this.data.cssrefs);
      cssrefs.forEach(function(cssref) {
        mainsrc += '  <link rel="stylesheet" type="text/css" href="' + cssref +
            '">\n';
      }.bind(this));
    }

    if (this.data.links) {
      this.data.links.forEach(function(link) {
        mainsrc += '  <link rel="' + link.rel + '" href="' + link.href + '">\n';
      });
    }

    if (this.data.inlines) {
      this.data.inlines.forEach(function(inline) {
        if (/\.js$/.test(inline)) {
          mainsrc += '<script>' + grunt.file.read(inline) + '</script>\n';
        } else if (/\.css$/.test(inline)) {
          mainsrc += '<style>' + grunt.file.read(inline) + '</style>\n';
        }
      }.bind(this));
    }

    if (this.data.scriptrefs) {
      var scriptrefs = grunt.file.expand(this.data, this.data.scriptrefs);
      scriptrefs.forEach(function(scriptref) {
        mainsrc += '  <script src="' + scriptref + '"></script>\n';
      }.bind(this));
    }

    mainsrc += '</head>\n';
    mainsrc += '<body>\n';
    mainsrc += '</body>\n';
    mainsrc += '</html>\n';

    grunt.file.write(this.data.dest, mainsrc);
  });
};
