// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import JsEntry from 'axiom/fs/js_entry';

/**
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
  JsEntry.call(this, jsfs, 'x');

  if (typeof callback != 'function')
    throw new AxiomError.TypeMismatch('function', callback);

  this.callback_ = callback;
  this.argSigil_ = argSigil;
};

export default JsExecutable;

JsExecutable.prototype = Object.create(JsEntry.prototype);

/**
 * @param {JsExecuteContext} jsExecuteContext
 */
JsExecutable.prototype.execute = function(jsExecuteContext) {
  var arg = jsExecuteContext.binding.arg;

  if ((this.argSigil_ == '$' && arg instanceof Object) ||
      (this.argSigil_ == '@' && !(arg instanceof Array)) ||
      (this.argSigil_ == '%' && (!(arg instanceof Object) ||
                                 (arg instanceof Array)))) {
    jsExecuteContext.binding.closeErrorValue(
        new AxiomError.TypeMismatch(this.argSigil_, arg));
    return;
  }

  var p = this.callback_(jsExecuteContext.binding, jsExecuteContext);
  if (!(p instanceof Promise)) {
    console.log(this.callback_);
    jsExecuteContext.binding.closeErrorValue(
        new AxiomError.Runtime('Executable did not return a Promise.'));
    return;
  }

  p.then(
    function(value) {
      if (jsExecuteContext.binding.isReadyState('READY'))
        jsExecuteContext.binding.closeOk(value);
    }
  ).catch(
    function(value) {
      if (jsExecuteContext.binding.isReadyState('READY'));
        jsExecuteContext.binding.closeErrorValue(value);
    }
  );
};

JsExecutable.prototype.stat = function() {
  return JsEntry.prototype.stat.call(this).then(
      function(rv) {
        rv['argSigil'] = this.argSigil_;
        return Promise.resolve(rv);
      }.bind(this));
};
