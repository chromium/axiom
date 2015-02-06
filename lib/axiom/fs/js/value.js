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

import OpenContext from 'axiom/fs/base/open_context';

/**
 * @constructor
 */
export var JsValue = function() {
  this.value = null;
};

export default JsValue;

/**
 * @param {OpenContext.ReadResult} readResult
 * @return Promise<OpenContext.ReadResult>
 */
JsValue.prototype.read = function(readResult) {
  readResult.dataType = OpenContext.DataType.Value;
  readResult.data = this.value;
  return Promise.resolve(readResult);
};

/**
 * @param {OpenContext.WriteResult} writeResult
 * @param {*} data
 * @return Promise<OpenContext.WriteResult>
 */
JsValue.prototype.write = function(writeResult, data) {
  if (writeResult.dataType == OpenContext.DataType.Value ||
      writeResult.dataType == OpenContext.DataType.UTF8String) {
    this.value = data;
  } else if (writeResult.dataType == OpenContext.DataType.Base64String) {
    this.value = window.btoa(data);
  }

  writeResult.dataType = OpenContext.DataType.Value;
  return Promise.resolve(writeResult);
};
