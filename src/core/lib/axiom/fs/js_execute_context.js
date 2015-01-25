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

import ExecuteContextBinding from 'axiom/bindings/fs/execute_context';

import JsExecutable from 'axiom/fs/js_executable';
import Path from 'axiom/fs/path';

/** @typedef JsEntry$$module$axiom$fs$js_entry */
var JsEntry;

/** @typedef JsFileSystem$$module$axiom$fs$js_file_system */
var JsFileSystem;

/**
 * Construct a new context that can be used to invoke an executable.
 *
 * @constructor
 * @param {JsFileSystem} jsfs
 * @param {Path} path
 * @param {JsEntry} entry
 * @param {Object} arg
 */
var JsExecuteContext = function(jsfs, path, entry, arg) {
  this.jsfs = jsfs;
  this.path = path;
  this.targetEntry = entry;
  this.arg = arg;

  this.binding = new ExecuteContextBinding(jsfs.binding, path.spec, arg);
  this.binding.bind(this, {
    execute: 'execute_'
  });
};

export {JsExecuteContext};
export default JsExecuteContext;

JsExecuteContext.prototype.execute_ = function() {
  this.targetEntry.execute(this);
};
