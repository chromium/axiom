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
import Path from 'axiom/fs/path';

/** @typedef DomFileSystem$$module$axiom$fs$dom_file_system */
var DomFileSystem;

/**
 * @constructor @extends {ExecuteContext}
 * Construct a new context that can be used to invoke an executable.
 *
 * @param {DomFileSystem} domfs
 * @param {Path} path
 * @param {Object} arg
 */
export var DomExecuteContext = function(domfs, path, arg) {
  this.domfs = domfs;
  this.path = path;
  this.arg = arg;
};

export default DomExecuteContext;

DomExecuteContext.prototype.execute_ = function() {
  return Promise.reject(new AxiomError(
      'NotImplemented', 'DOM filesystem is not executable.'));
};
