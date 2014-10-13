// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Registry of commands.
 */
export var CommandManager = function() {

};

export default CommandManager;

/**
 * Extending the command manager adds to the list of commands.
 *
 * The extension descriptor should enumerate the commands to be added, and
 * the binding should provide a 'call' function which takes (name, arg) and
 * invokes the named command with the given argument.
 */
CommandManager.prototype.extend = function(extension) {

};
