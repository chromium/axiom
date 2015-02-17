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
 * @param {string} argSigil  A sigil representing the argument type expected
 *   by this executable.  "$" -> String, "@" -> Array, "%" -> Object,
 *   "*" -> Any.
 */
export var JsExecutable = function(jsfs, callback, argSigil) {
  JsEntry.call(this, jsfs, 'X');

  if (typeof callback != 'function')
    throw new AxiomError.TypeMismatch('function', callback);

  this.callback_ = callback;
  this.argSigil_ = argSigil;
};

export default JsExecutable;

JsExecutable.prototype = Object.create(JsEntry.prototype);

/**
 * @override
 */
JsExecutable.prototype.stat = function() {
  return JsEntry.prototype.stat.call(this).then(
      function(rv) {
        rv['argSigil'] = this.argSigil_;
        return Promise.resolve(rv);
      }.bind(this));
};

/**
 * @param {JsExecuteContext} cx
 * @return {Promise<*>}
 */
JsExecutable.prototype.execute = function(cx) {
  var arg = cx.arg;

  if ((this.argSigil_ == '$' && arg instanceof Object) ||
      (this.argSigil_ == '@' && !(arg instanceof Array)) ||
      (this.argSigil_ == '%' && (!(arg instanceof Object) ||
                                 (arg instanceof Array)))) {
    return cx.closeError(new AxiomError.TypeMismatch(this.argSigil_, arg));
  }

  /** @type {Promise<*>} */
  var p;

  try {
    p = this.callback_(cx);
  } catch (ex) {
    console.log(ex);
    p = Promise.reject(ex);
  }

  if (!(p instanceof Promise)) {
    console.log(this.callback_);
    return cx.closeError(
        new AxiomError.Runtime('Executable did not return a Promise.'));
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
