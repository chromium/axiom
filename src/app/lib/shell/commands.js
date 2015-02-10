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
import ModuleManager from 'axiom/core/module_manager';

import environment from 'shell/environment';
import TerminalView from 'shell/views/terminal';

/** @typedef BaseBinding$$module$axiom$bindings$base */
var BaseBinding;

/** @typedef ModuleManager$$module$axiom$core$module_manager */
var ModuleManager;

/**
 * @constructor @extends {BaseBinding};
 * @param {ModuleManager} moduleManager
 */
var ShellCommands = function(moduleManager) {
  this.moduleManager = moduleManager;
  this.extensionBinding = null;
};

export {ShellCommands};
export default ShellCommands;

ShellCommands.prototype.bind = function(extensionBinding) {
  this.extensionBinding = extensionBinding;
  this.extensionBinding.bind(this, {'call': this.call});
  this.extensionBinding.ready();
};

ShellCommands.prototype.call = function(name, arg) {
  if (!(name in ShellCommands.commands))
    return Promise.reject(new AxiomError.NotFound('command-name', [name]));

  return ShellCommands.commands[name].call(this, arg, name);
};

ShellCommands.commands = {
  'launch-hterm': function(arg) {
    console.log('Lauching app!');
    var fs = environment.getServiceBinding('filesystems@axiom');
    fs.whenLoadedAndReady().then(
      function() {
        fs.createExecuteContext(
          '/addon/shell/exe/hterm',
          {command: '/addon/shell/exe/wash',
           arg: {init: true}
          }
        ).then(
          function(cx) {
            cx.execute();
          }
        );
      });
  }
};
