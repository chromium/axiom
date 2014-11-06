// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import JsFileSystem from 'axiom/fs/js_file_system';

export var ShellFS = function(moduleManager) {
  this.moduleManager = moduleManager;
  this.fileSystemExtensionBinding = null;
  this.jsfs = null;
};

export default ShellFS;

ShellFS.prototype.bind = function(fileSystemExtensionBinding) {
  this.fileSystemExtensionBinding = fileSystemExtensionBinding;

  this.jsfs = new JsFileSystem(null, fileSystemExtensionBinding);
  this.jsfs.mkdir('exe');
  this.jsfs.mkdir('proc');
};
