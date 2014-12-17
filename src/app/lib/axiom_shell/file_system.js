// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import JsFileSystem from 'axiom/fs/js_file_system';
import DomFileSystem from 'axiom/fs/dom_file_system';

import catMain from 'axiom_shell/exe/cat';
import clearMain from 'axiom_shell/exe/clear';
import cpMain from 'axiom_shell/exe/cp';
import echoMain from 'axiom_shell/exe/echo';
import htermMain from 'axiom_shell/exe/hterm';
import importMain from 'axiom_shell/exe/import';
import lsMain from 'axiom_shell/exe/ls';
import mkdirMain from 'axiom_shell/exe/mkdir';
import readlineMain from 'axiom_shell/exe/readline';
import rmMain from 'axiom_shell/exe/rm';
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
          'cat': catMain,
          'clear': clearMain,
          'cp': cpMain,
          'echo': echoMain,
          'hterm': htermMain,
          'import': importMain,
          'ls': lsMain,
          'mkdir': mkdirMain,
          'readline': readlineMain,
          'rm': rmMain,
          'wash': washMain,
        });
      });

  this.jsfs.mkdir('proc');
};
