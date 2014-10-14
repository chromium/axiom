// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
          "js/axiom_npm_deps.amd.js",
          "js/axiom.amd.js",
          "js/axiom_shell.amd.js",
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
