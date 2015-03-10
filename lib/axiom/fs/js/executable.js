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
import JsEntry from 'axiom/fs/js/entry';

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
var JsFileSystem;

/**
 * @constructor @extends {JsEntry}
 * An executable file in a JsFileSystem.
 *
 * @param {JsFileSystem} jsfs  The parent file system.
 * @param {function(JsExecuteContext)} callback  The function to call when the
 *   executable is invoked.
 * @param {Object} signature  An object describing the arguments expected by
 *   this executable.
 */
export var JsExecutable = function(jsfs, callback, signature) {
  JsEntry.call(this, jsfs, 'X');

  if (typeof callback != 'function')
    throw new AxiomError.TypeMismatch('function', callback);

  this.callback_ = callback;
  this.signature = signature;
};

export default JsExecutable;

JsExecutable.prototype = Object.create(JsEntry.prototype);

/**
 * @override
 */
JsExecutable.prototype.stat = function() {
  return JsEntry.prototype.stat.call(this).then(
      function(/** StatResult */ rv) {
        rv.signature = this.signature;
        return Promise.resolve(rv);
      }.bind(this));
};

/**
 * @param {JsExecuteContext} cx
 * @return {Promise<*>}
 */
JsExecutable.prototype.execute = function(cx) {
  /** @type {Promise<*>} */
  var p;

  try {
    p = this.callback_(cx);
  } catch (ex) {
    console.log(ex);
    p = Promise.reject(ex);
  }

  if (!p || p == cx.ephemeralPromise) {
    return cx.ephemeralPromise;
  }

  if (!(p instanceof Promise)) {
    return cx.closeError(
        new AxiomError.Runtime('Executable should return null or a promise.'));
  }

  return p.then(
    function(value) {
      if (cx.isEphemeral('Ready'))
        cx.closeOk(value);

      return cx.ephemeralPromise;
    }
  ).catch(
    function(value) {
      if (cx.isEphemeral('Ready'))
        cx.closeError(value);

      return cx.ephemeralPromise;
    }
  );
};
