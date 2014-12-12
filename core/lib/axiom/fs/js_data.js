// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import JsEntry from 'axiom/fs/js_entry';

/**
 * @param {JsFileSystem} jsfs
 * @param {Object} value
 * @param {string} opt_modeStr
 */
export var JsData = function(jsfs, value, opt_modeStr) {
  JsEntry.call(this, jsfs, opt_modeStr || 'rw');
  this.value_ = value;
};

export default JsData;

JsData.prototype = Object.create(JsEntry.prototype);

JsData.prototype.stat = function() {
  var rv = JsEntry.prototype.stat.call(this);
  // naturalType will indicate to the consumer the data type that can be read
  // without involving a conversion.
  rv['naturalType'] = 'value';
  return rv;
};

// TODO: We're going to have to fire an event or invoke a callback so the
// data source knows something changed.
JsData.prototype.write = function(arg) {
  return Promise.reject(new AxiomError.NotImplemented('sorry'));
};

// TODO: Probably want to invoke a callback so the data source can construct the
// data dynamically.
JsData.prototype.read = function(arg) {
  return Promise.reject(new AxiomError.NotImplemented('sorry'));
};
