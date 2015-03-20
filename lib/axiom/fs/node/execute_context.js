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
import Stdio from 'axiom/fs/stdio';

import Path from 'axiom/fs/path';

/** @typedef {Arguments$$module$axiom$fs$arguments} */
var Arguments;

/** @typedef NodeFileSystem$$module$axiom$fs$node$file_system */
var NodeFileSystem;

/**
 * @constructor @extends {ExecuteContext}
 * Construct a new context that can be used to invoke an executable.
 *
 * @param {!NodeFileSystem} nodefs
 * @param {!Stdio} stdio
 * @param {Path} path
 * @param {Arguments} arg
 */
export var NodeExecuteContext = function(nodefs, stdio, path, args) {
  ExecuteContext.call(this, nodefs, stdio, path, args);
};

export default NodeExecuteContext;

NodeExecuteContext.prototype = Object.create(ExecuteContext.prototype);

/**
 * @override
 * @return {!Promise<*>}
 */
NodeExecuteContext.prototype.execute = function() {
  return Promise.reject(
      new AxiomError.NotImplemented('Node file system is not yet executable.'));
};
