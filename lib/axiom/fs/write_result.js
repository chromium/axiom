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

import DataType from 'axiom/fs/data_type';

/** @typedef {SeekWhence$$module$axiom$fs$seek_whence} */
var SeekWhence;

/**
 * @constructor
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} dataType
 * @param {*} data
 */
export var WriteResult = function(offset, whence, dataType, data) {
  /** @type {number} */
  this.offset = offset;

  /** @type {SeekWhence} */
  this.whence = whence;

  /** @type {DataType} */
  this.dataType = dataType || DataType.UTF8String;

  /** @type {string} */
  this.mimeType =
      dataType === DataType.Blob ? '' :
      dataType === DataType.ArrayBuffer ? 'application/octet-stream' :
      dataType === DataType.Base64String ? 'application/octet-stream' :
      dataType === DataType.UTF8String ? 'text/plain' :
      dataType === DataType.Value ? 'text/json' :
          '';
  
  /** @type {*} */
  this.data =
      // TODO: Once we turn this into a string the data may already have
      // been munged.  We need an ArrayBuffer->Base64 string implementation
      // to make this work for real.
      dataType === DataType.Base64String ? window.atob(data.toString()) :
      dataType === DataType.Value ? JSON.stringify(data) :
          data;
};

export default WriteResult;

/**
 * Returns `data` if it's already a Blob, or constructs a new Blow from `data`
 * and `mimeType`.
 *
 * @return {!Blob}
 */
WriteResult.prototype.getBlob = function() {
  return this.dataType === DataType.Blob ?
    /** @type {!Blob} */ (this.data) :
    new Blob([this.data], {type: this.mimeType});
};
