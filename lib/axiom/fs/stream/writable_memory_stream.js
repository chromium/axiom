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

import AxiomError from 'axiom/core/error';
import WritableStream from 'axiom/fs/stream/writable_stream';

/** @typedef MemoryStreamBuffer$$module$axiom$fs$stream$memory_stream_buffer */
var MemoryStreamBuffer;

/** @typedef function():void */
var EventCallback;

/**
 * Event value + associated callback
 * @constructor
 * @param {!*} value
 * @param {!EventCallback} callback
 */
var EventWithCallback = function(value, callback) {
  this.value = value;
  this.callback = callback;
};

/**
 * @constructor @extends {WritableStream}
 * @param {MemoryStreamBuffer} buffer
 */
export var WritableMemoryStream = function(buffer) {
  WritableStream.call(this);
  /** @const @private @type {MemoryStreamBuffer} */
  this.buffer_ = buffer;
};

export default WritableMemoryStream;

WritableMemoryStream.prototype = Object.create(WritableStream.prototype);

/**
 * Write an event to the stream.
 *
 * @override
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
WritableMemoryStream.prototype.write = function(value, opt_callback) {
  return this.buffer_.push(value, opt_callback);
};
