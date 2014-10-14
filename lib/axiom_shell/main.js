// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import axiomMain from 'axiom/main';

import descriptor from 'axiom_shell/descriptor';
import bind from 'axiom_shell/bind';

export var main = function() {
  return axiomMain().then(function(moduleManager) {
      var module = moduleManager.defineModule(descriptor);
      bind(module);

      return moduleManager;
    });
};

export default main;
