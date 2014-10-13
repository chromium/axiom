// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import washMain from 'wash/main';

// For jshint...
/* global chrome */

/**
 * True if we were launched before initialization completed.
 */
var didLaunchEarly = false;

/**
 * A reference to the axiom 'commands' service.
 */
var axiomCommands = null;

/**
 * Called when the user clicks the app-launcher icon.
 */
var onLaunched = function() {
  if (!axiomCommands) {
    didLaunchEarly = true;
    return;
  }

  axiomCommands.dispatch('launch-app');
};

// Register onLaunched...
chrome.app.runtime.onLaunched.addListener(onLaunched);

// And start initialization...
washMain().then(function(packageManager) {
  packageManager.serviceManager.getService('commands').then(
    function(c) {
      axiomCommands = c;
      if (didLaunchEarly)
        onLaunched();
    });
});
