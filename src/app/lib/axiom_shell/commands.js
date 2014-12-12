// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'axiom_shell/environment';
import TerminalView from 'axiom_shell/views/terminal';

export var ShellCommands = function(moduleManager) {
  this.moduleManager = moduleManager;
  this.extensionBinding = null;
};

export default ShellCommands;

ShellCommands.prototype.bind = function(extensionBinding) {
  this.extensionBinding = extensionBinding;
  this.extensionBinding.bind(this, {'call': this.call});
  this.extensionBinding.ready();
};

ShellCommands.prototype.call = function(name, arg) {
  if (!(name in ShellCommands.commands))
    return Promise.reject(AxiomError.NotFound('command-name', [name]));

  return ShellCommands.commands[name].call(this, arg, name);
};

ShellCommands.commands = {
  'launch-app': function(arg) {
    console.log('Lauching app!');
    var fs = environment.getServiceBinding('filesystems@axiom');
    fs.createContext('execute', '/axiom_shell/exe/hterm', {}).then(
      function(cx) {
        cx.execute();
      });
  }
};
