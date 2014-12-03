// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import JsEntry from 'axiom/fs/js_entry';

/**
 * An executable file in a JsFileSystem.
 *
 * @param {JsFileSystem} jsfs  The parent file system.
 * @param {function(JsExecuteContext)} callback  The function to call when the
 *   executable is invoked.
 * @param {Array<Object>} signature  An ordered list of the parameters this
 */
export var JsExecutable = function(jsfs, callback, signature) {
  JsEntry.call(this, jsfs, 'x');

  this.callback_ = callback;
  this.signature_ = signature;
};

export default JsExecutable;

JsExecutable.prototype = Object.create(JsEntry.prototype);

/**
 * @param {JsExecuteContext} jsExecuteContext
 */
JsExecutable.prototype.execute = function(jsExecuteContext) {
  return this.callback_(jsExecuteContext.binding, jsExecuteContext).then(
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
        rv['signature'] = this.signature_;
        return Promise.resolve(rv);
      }.bind(this));
};
