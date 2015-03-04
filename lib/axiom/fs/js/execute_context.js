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

/** @typedef Arguments$$module$axiom$fs$arguments */
var Arguments;

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
 * @param {Arguments} args
 */
export var JsExecuteContext = function(jsfs, path, executable, args) {
  ExecuteContext.call(this, jsfs, path, args);

  this.jsfs = jsfs;
  this.targetExecutable = executable;
};

export default JsExecuteContext;

JsExecuteContext.prototype = Object.create(ExecuteContext.prototype);

/**
 * @override
 * @return {!Promise<*>}
 */
JsExecuteContext.prototype.execute = function() {
  ExecuteContext.prototype.execute.call(this);

  return this.targetExecutable.execute(this).then(
      function(value) {
        if (this.isEphemeral('Ready'))
          return this.closeOk(value);
        return this.ephemeralPromise;
      }.bind(this),
      function(value) {
        if (this.isEphemeral('Ready'))
          return this.closeError(value);
        return this.ephemeralPromise;
      }.bind(this));
};
