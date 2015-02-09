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

import ExecuteContext from 'axiom/fs/base/execute_context';

import Path from 'axiom/fs/path';
import JsExecutable from 'axiom/fs/js/executable';

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef JsEntry$$module$axiom$fs$js$entry */
var JsEntry;

/** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
var JsFileSystem;

/**
 * @constructor @extends {ExecuteContext}
 *
 * Construct a new context that can be used to invoke an executable.
 *
 * @param {!JsFileSystem} jsfs
 * @param {!Path} path
 * @param {!JsExecutable} executable
 * @param {*} arg
 */
export var JsExecuteContext = function(jsfs, path, executable, arg) {
  ExecuteContext.call(this, /** FileSystem */ (jsfs), path.spec, arg);

  this.jsfs = jsfs;
  this.path = path;
  this.targetExecutable = executable;
};

export default JsExecuteContext;

JsExecuteContext.prototype = Object.create(ExecuteContext.prototype);

/**
 * @override
 * @return {!Promise<*>}
 */
JsExecuteContext.prototype.execute = function() {
  return ExecuteContext.prototype.execute.call(this).then(
    function(ephemeralPromise) {
      return this.targetExecutable.execute(this).then(
          this.closeOk.bind(this),
          this.closeError.bind(this));
    }.bind(this));
};
