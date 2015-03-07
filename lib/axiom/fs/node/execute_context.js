// Copyright 2015 Google Inc. All rights reserved.
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

import ExecuteContext from 'axiom/fs/base/execute_context';
import Stdio from 'axiom/fs/base/stdio';

import Path from 'axiom/fs/path';

/** @typedef NodeFileSystem$$module$axiom$fs$node$file_system */
var NodeFileSystem;

/**
 * @constructor @extends {ExecuteContext}
 * Construct a new context that can be used to invoke an executable.
 *
 * @param {!NodeFileSystem} nodefs
 * @param {!Stdio} stdio
 * @param {Path} path
 * @param {*} arg
 */
export var NodeExecuteContext = function(nodefs, stdio, path, arg) {
  this.nodefs = nodefs;
  this.stdio = stdio;
  this.path = path;
  this.arg = arg;
};

export default NodeExecuteContext;

NodeExecuteContext.prototype.execute_ = function() {
  return Promise.reject(new AxiomError(
      'NotImplemented', 'Node filesystem is not yet executable.'));
};
