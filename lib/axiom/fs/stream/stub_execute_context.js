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

import ExecuteContext from 'axiom/fs/base/execute_context';
import Stdio from 'axiom/fs/stdio';

import Path from 'axiom/fs/path';
import JsExecutable from 'axiom/fs/js/executable';

/** @typedef Arguments$$module$axiom$fs$arguments */
var Arguments;

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef Stdio$$module$axiom$fs$stdio */
var Stdio;

/** @typedef StubFileSystem$$module$axiom$fs$stream$stub_file_system */
var StubFileSystem;

/**
 * @constructor @extends {ExecuteContext}
 *
 * Construct a new context that can be used to invoke an executable.
 *
 * @param {!StubFileSystem} fileSystem
 * @param {!string} contextId
 * @param {!Stdio} stdio
 * @param {!Path} path
 * @param {Arguments} args
 */
export var StubExecuteContext =
    function(fileSystem, stdio, path, args, contextId) {
  ExecuteContext.call(this, fileSystem, stdio, path, args);

  /**
   * @const @type {!string}
   */
  this.contextId_ = contextId;

  this.onClose.addListener(this.onClose_, this);
};

export default StubExecuteContext;

StubExecuteContext.prototype = Object.create(ExecuteContext.prototype);

/**
 * @override
 * @return {!Promise<*>}
 */
StubExecuteContext.prototype.execute = function() {
  this.assertEphemeral('Wait');
  this.ready();

  // Execute on remote peer.
  return this.fileSystem.sendRequest_({
      cmd: 'execute-context.execute',
      contextId: this.contextId_}).then(
    function(value) {
      if (this.isEphemeral('Ready'))
        return this.closeOk(value);
      return this.ephemeralPromise;
    }.bind(this),
    function(value) {
      if (this.isEphemeral('Ready'))
        return this.closeError(value);
      return this.ephemeralPromise;
    }.bind(this)
  );
};

/**
 * @return {void}
 */
StubExecuteContext.prototype.onClose_ = function(closeReason, closeValue) {
  this.fileSystem.sendRequest_({
      cmd: 'execute-context.close',
      contextId: this.contextId_,
      closeReason: closeReason,
      closeValue: closeValue}).then(
    function(response) {
      // TODO(rpaquay): What do we do here?
    }
  );
};
