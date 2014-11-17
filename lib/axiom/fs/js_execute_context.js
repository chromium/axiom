// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import ExecuteContextBinding from 'axiom/bindings/fs/execute_context';

import JsExecutable from 'axiom/fs/js_executable';
import Path from 'axiom/fs/path';

/**
 * Construct a new context that can be used to invoke an executable.
 *
 * @constructor
 * @param {JsFileSystem} jsfs
 * @param {Path} path
 * @param {JsEntry} entry
 * @param {Object} arg
 */
export var JsExecuteContext = function(jsfs, path, entry, arg) {
  this.jsfs = jsfs;
  this.path = path;
  this.targetEntry = entry;
  this.arg = arg;

  this.binding = new ExecuteContextBinding(jsfs.binding, path.spec, arg);
  this.binding.bind(this, {
    execute: 'execute_'
  });
};

export default JsExecuteContext;

JsExecuteContext.prototype.execute_ = function() {
  this.targetEntry.execute(this);
};
