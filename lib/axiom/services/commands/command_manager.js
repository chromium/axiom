// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Err from 'axiom/core/err';

/**
 * Registry of commands.
 */
export var CommandManager = function() {
  this.commands_ = {};
  this.extensions_ = [];
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
 */
CommandManager.prototype.onExtend = function(extension) {
  this.extensions_.push(extension);
  var defineCommands = extension.descriptor['define-commands'];
  for (var name in defineCommands) {
    this.commands_[name] = {
      descriptor: defineCommands[name],
      extension: extension
    };
  }
};

CommandManager.prototype.dispatch = function(name, arg) {
  var command = this.commands_[name];
  if (!command)
    return Promise.reject(Err.NotFound('command', name));

  var binding = command.extension.binding;
  return binding.whenLoadedAndReady().then(
      function() { binding.call(name, arg) });
};
