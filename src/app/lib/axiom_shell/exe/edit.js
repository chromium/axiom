// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import EditorView from 'axiom_shell/views/editor';
import Path from 'axiom/fs/path';

/**
 * Setup an EditorView and pass params
 */
export var main = function(executeContext) {
  executeContext.ready();
  var editorView = new EditorView(this.moduleManager);
  var arg = executeContext.arg;
  // if (!arg._ && arg._.length)
  //   return Promise.reject(new AxiomError.Missing('path'));

  var filePath = arg._.shift();

  filePath = Path.abs(executeContext.getEnv('$PWD', '/'), filePath);

  editorView.execute(filePath);
  return Promise.resolve(null);
};

export default main;

/**
 * Accept any value for the execute context arg.
 */
main.argSigil = '%';
