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

// Register onLaunched...
chrome.app.runtime.onLaunched.addListener(onLaunched);

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
