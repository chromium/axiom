// Copyright (c) 2015 Google Inc. All rights reserved.
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

import OpenContext from 'axiom/fs/base/open_context';
import JsEntry from 'axiom/fs/js/entry';

/** @typedef {JsFileSystem$$module$axiom$fs$js$file_system} */
var JsFileSystem;

/**
 * @constructor @extends {JsEntry}
 *
 * An entry that represents a read/write value.
 *
 * @param {JsFileSystem} jsfs The parent file system.
 * @param {string} modeStr
 */
export var JsValue = function(jsfs, modeStr) {
  JsEntry.call(this, jsfs, modeStr);

  /** @type {*} */
  this.value = null;
};

export default JsValue;

JsValue.prototype = Object.create(JsEntry.prototype);

/**
 * @param {OpenContext.ReadResult} readResult
 * @return !Promise<!OpenContext.ReadResult>
 */
JsValue.prototype.read = function(readResult) {
  readResult.dataType = OpenContext.DataType.Value;
  readResult.data = this.value;
  return Promise.resolve(readResult);
};

/**
 * @param {OpenContext.WriteResult} writeResult
 * @param {*} data
 * @return !Promise<!OpenContext.WriteResult>
 */
JsValue.prototype.write = function(writeResult, data) {
  if (writeResult.dataType == OpenContext.DataType.Value ||
      writeResult.dataType == OpenContext.DataType.UTF8String) {
    this.value = data;
  } else if (typeof data == 'string' &&
      writeResult.dataType == OpenContext.DataType.Base64String) {
    this.value = window.btoa(data);
  } else {
    return Promise.reject(new AxiomError.Invalid('dataType',
                                                 writeResult.dataType));
  }

  writeResult.dataType = OpenContext.DataType.Value;
  return Promise.resolve(writeResult);
};
