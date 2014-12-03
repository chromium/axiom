// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import shellMain from 'axiom_shell/main';

// For jshint...
/* global chrome */

// Generic logger of failed promises.
var logCatch = function(err) {
  console.log('logCatch: ' + err.toString(), err);
  if ('stack' in err)
    console.log(err.stack);
};

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
  if (!axiomCommands || !axiomCommands.isReadyState('READY')) {
    didLaunchEarly = true;
    return;
  }

  axiomCommands.dispatch('launch-app').catch(logCatch);
};

// Register onLaunched (for Chrome App) or just launch right away
if (chrome.app && chrome.app.runtime && chrome.app.runtime.onLaunched) {
  chrome.app.runtime.onLaunched.addListener(onLaunched);
} else {
  onLaunched();
}

// And start initialization...
shellMain().then(
  function(moduleManager) {
    axiomCommands = moduleManager.getServiceBinding('commands@axiom');
    return axiomCommands.whenReady().then(
      function() {
        if (didLaunchEarly)
          onLaunched();
      });
  }).catch(logCatch);
