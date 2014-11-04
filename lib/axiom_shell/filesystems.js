// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

export var ShellFS = function(moduleManager) {
  this.moduleManager = moduleManager;
  this.extensionBinding = null;
};

export default ShellFS;

ShellFS.prototype.bind = function(extensionBinding) {
  this.extensionBinding = extensionBinding;

  this.extensionBinding.ready();
};
