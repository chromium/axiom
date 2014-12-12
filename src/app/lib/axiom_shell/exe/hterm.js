// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import TerminalView from 'axiom_shell/views/terminal';

/**
 * Simple callback for a JsExecutable which echos the argument list to stdout
 * and exits.
 */
export var main = function(cx) {
  cx.ready();
  var tv = new TerminalView(this.moduleManager);
  var command = cx.arg['command'] || '/axiom_shell/exe/wash';
  var env = cx.arg['env'] || {'@PATH': ['/axiom_shell/exe/']};
  tv.execute(command, {}, env);
  return Promise.resolve(null);
};

export default main;

/**
 * Accept any value for the execute context arg.
 */
main.argSigil = '%';
