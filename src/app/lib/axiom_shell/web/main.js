// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import shellMain from 'axiom_shell/main';

// Generic logger of failed promises.
var logCatch = function(err) {
  console.log('logCatch: ' + err.toString(), err);
  if ('stack' in err)
    console.log(err.stack);
};

// Start initialization...
shellMain().then(
  function(moduleManager) {
    var axiomCommands = moduleManager.getServiceBinding('commands@axiom');
    return axiomCommands.whenReady().then(
      function() {
        axiomCommands.dispatch('launch-app').catch(logCatch);
      });
  }).catch(logCatch);
