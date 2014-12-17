// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
          'cat': catMain,
          'clear': clearMain,
          'cp': cpMain,
          'echo': echoMain,
          'hterm': htermMain,
          'import': importMain,
          'ls': lsMain,
          'readline': readlineMain,
          'wash': washMain,
        });
      });

  this.jsfs.mkdir('proc');
};
