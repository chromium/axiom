// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import ModuleManager from 'axiom/core/module_manager';

import descriptor from 'axiom/descriptor';
import bind from 'axiom/bind';

export var main = function() {
  var moduleManager = new ModuleManager();
  return moduleManager.defineModule(descriptor).then(
      function(module) {
        bind(module);
        return moduleManager;
      });
};

export default main;
