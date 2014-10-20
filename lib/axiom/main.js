// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import ModuleManager from 'axiom/core/module_manager';

import axiomDescriptor from 'axiom/descriptor';
import axiomBind from 'axiom/bind';

export var main = function() {
  var moduleManager = new ModuleManager();

  var module = moduleManager.defineModule(axiomDescriptor);
  axiomBind(module);
  module.ready();

  return Promise.resolve(moduleManager);
};

export default main;
