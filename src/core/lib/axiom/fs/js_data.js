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
import JsEntry from 'axiom/fs/js_entry';

goog.forwardDeclare('JsFileSystem');

/**
 * @constructor
 * @param {JsFileSystem} jsfs
 * @param {Object} value
 * @param {string} opt_modeStr
 */
var JsData = function(jsfs, value, opt_modeStr) {
  JsEntry.call(this, jsfs, opt_modeStr || 'rw');
  this.value_ = value;
};

export {JsData};
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
