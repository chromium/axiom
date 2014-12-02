// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Global axiom_shell environment.
 *
 * After axiom_shell is initialized, other modules can use this to get at
 * global state.
 */
var axiomModuleManager;

export var environment = {
  setModuleManager: function(mm) {
    axiomModuleManager = mm;
  },

  getServiceBinding: function(name) {
    return axiomModuleManager.getServiceBinding(name);
  }
};

export default environment;
