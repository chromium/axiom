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

/**
 * Task to emit out manifest.json file.
 */
var makeManifest = function(version, mode) {
  var manifest = {
    minimum_chrome_version: "23",
    manifest_version: 2,
    name: "Axiom Shell",
    version: version,
    icons: {
      "128": 'images/' + mode + '/128.png',
    },
    description: "Axiom shell.",
    offline_enabled: true,
    permissions: [
      "clipboardRead",
      "clipboardWrite",
      "unlimitedStorage",
      "storage",
      "http://*/*",
      "https://*/*"
    ],
    app: {
      background: {
        scripts: [
          "js/amd_loader.js",
          "js/hterm.amd.min.js",
          "js/axiom_npm_deps.amd.js",
          "js/axiom.amd.js",
          "js/shell.amd.js",
          "js/chrome_app_background.js"
        ]
      }
    }
  };

  if (mode != 'stable')
    manifest.name += ' (' + mode + ')';

  return manifest;
};

module.exports = function(grunt) {
  grunt.registerMultiTask
  ('chrome_app_manifest',
   'Emit a Chrome App manifest.json file.',
   function() {
     var manifest = makeManifest(this.data.version, this.data.mode);
     grunt.file.write(this.data.dest, JSON.stringify(manifest, null, '  '));
   });
};
