// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import ExecuteContextBinding from 'axiom/bindings/fs/execute_context';

import Path from 'axiom/fs/path';

/**
 * Construct a new context that can be used to invoke an executable.
 *
 * @constructor
 * @param {DomFileSystem} domfs
 * @param {Path} path
 * @param {FileEntry} entry
 * @param {Object} arg
 */
export var DomExecuteContext = function(domfs, path, entry, arg) {
  this.domfs = domfs;
  this.path = path;
  this.targetEntry = entry;
  this.arg = arg;

  this.binding = new ExecuteContextBinding(domfs.binding, path.spec, arg);
  this.binding.bind(this, {
    execute: 'execute_'
  });
};

export default DomExecuteContext;

DomExecuteContext.prototype.execute_ = function() {
  return Promise.reject(new AxiomError(
      'NotImplemented', 'DOM filesystem is not executable.'));
};
