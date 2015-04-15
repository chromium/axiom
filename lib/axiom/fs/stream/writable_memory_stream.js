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
import AxiomStream from 'axiom/fs/stream/axiom_stream';

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/** @typedef MemoryStreamBuffer$$module$axiom$fs$stream$memory_stream_buffer */
var MemoryStreamBuffer;

/** @typedef WriteCallback$$module$axiom$fs$stream$writable_stream */
var WriteCallback;

/**
 * Event value + associated callback
 * @constructor
 * @param {!*} value
 * @param {!WriteCallback} callback
 */
var EventWithCallback = function(value, callback) {
  this.value = value;
  this.callback = callback;
};

/**
 * @constructor @extends {AxiomStream} @implements {WritableStream}
 * @param {MemoryStreamBuffer} buffer
 */
export var WritableMemoryStream = function(buffer) {
  AxiomStream.call(this);
  /** @const @private @type {MemoryStreamBuffer} */
  this.buffer_ = buffer;
};

export default WritableMemoryStream;

WritableMemoryStream.prototype = Object.create(AxiomStream.prototype);

/**
 * Write an event to the stream.
 *
 * @override
 * @param {!*} value
 * @param {WriteCallback=} opt_callback
 * @return {void}
 */
WritableMemoryStream.prototype.write = function(value, opt_callback) {
  return this.buffer_.write(value, opt_callback);
};
