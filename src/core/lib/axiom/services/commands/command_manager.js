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

import ExtensionBinding from 'axiom/bindings/extension';

/**
 * Registry of commands.
 */
export var CommandManager = function() {
  this.commands_ = {};
  this.extensionBindings_ = [];
};

export default CommandManager;

CommandManager.prototype.bind = function(serviceBinding) {
  serviceBinding.bind(this, {
    'dispatch': this.dispatch,
    'onExtend': this.onExtend
  });

  serviceBinding.ready();
};

/**
 * Extending the command manager adds to the list of commands.
 *
 * The extension descriptor should enumerate the commands to be added, and
 * the binding should provide a 'call' function which takes (name, arg) and
 * invokes the named command with the given argument.
 *
 * @param {ExtensionBinding} extensionBinding
 */
CommandManager.prototype.onExtend = function(extensionBinding) {
  this.extensionBindings_.push(extensionBinding);
  var defineCommands = extensionBinding.descriptor['define-commands'];
  for (var name in defineCommands) {
    this.commands_[name] = {
      descriptor: defineCommands[name],
      extensionBinding: extensionBinding
    };
  }
};

/**
 * @param {string} name
 * @param {Object} arg
 */
CommandManager.prototype.dispatch = function(name, arg) {
  var command = this.commands_[name];
  if (!command)
    return Promise.reject(AxiomError.NotFound('command', name));

  var binding = command.extensionBinding;
  return binding.whenLoadedAndReady().then(
      function() { binding.call(name, arg) });
};
