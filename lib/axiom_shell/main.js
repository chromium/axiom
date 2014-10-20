// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import axiomMain from 'axiom/main';

import shellDescriptor from 'axiom_shell/descriptor';
import shellBind from 'axiom_shell/bind';

export var main = function() {
  return axiomMain().then(function(moduleManager) {
    var shellModule = moduleManager.defineModule(shellDescriptor);

    shellBind(shellModule);
    shellModule.ready();

    return moduleManager;
  });
};

export default main;
