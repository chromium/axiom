// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import JsFileSystem from 'axiom/fs/js_file_system';

import echoMain from 'axiom_shell/exe/echo';
import lsMain from 'axiom_shell/exe/ls';
import readlineMain from 'axiom_shell/exe/readline';
import washMain from 'axiom_shell/exe/wash';

export var ShellFS = function(moduleManager) {
  this.moduleManager = moduleManager;
  this.fileSystemExtensionBinding = null;
  this.jsfs = null;
};

export default ShellFS;

ShellFS.prototype.bind = function(fileSystemExtensionBinding) {
  this.fileSystemExtensionBinding = fileSystemExtensionBinding;

  this.jsfs = new JsFileSystem(null, fileSystemExtensionBinding);
  this.jsfs.mkdir('exe').then(
      function(jsdir) {
        jsdir.install({
          'echo': echoMain,
          'ls': lsMain,
          'readline': readlineMain,
          'wash': washMain,
        });
      });

  this.jsfs.mkdir('proc');
};
