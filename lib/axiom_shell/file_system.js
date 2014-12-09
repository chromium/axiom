// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import JsFileSystem from 'axiom/fs/js_file_system';
import DomFileSystem from 'axiom/fs/dom_file_system';

import catMain from 'axiom_shell/exe/cat';
import cpMain from 'axiom_shell/exe/cp';
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

var mountDomfs = function() {
  var requestFs = window.requestFileSystem || window.webkitRequestFileSystem;
  var capacity = 16 * 1024 * 1024;

  var onFileSystemFound = function(fs) {
    this.domfs = new DomFileSystem(fs);
    this.jsfs.rootDirectory.mount('domfs', this.domfs.binding);
  }.bind(this);

  var onFileSystemError = function(e) {
    throw new AxiomError.Runtime(e);
  };

  requestFs(window.PERSISTENT, capacity, onFileSystemFound, onFileSystemError);
};

ShellFS.prototype.bind = function(fileSystemExtensionBinding) {
  this.fileSystemExtensionBinding = fileSystemExtensionBinding;

  this.jsfs = new JsFileSystem(null, fileSystemExtensionBinding);
  this.jsfs.mkdir('exe').then(
      function(jsdir) {
        jsdir.install({
          'cat': catMain,
          'cp': cpMain,
          'echo': echoMain,
          'ls': lsMain,
          'readline': readlineMain,
          'wash': washMain,
        });
      });

  this.jsfs.mkdir('proc');
  mountDomfs.bind(this)();
};

