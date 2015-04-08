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
import AxiomEvent from 'axiom/core/event';
import AxiomStream from 'axiom/fs/stream/axiom_stream';

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/** @typedef StreamBuffer$$module$axiom$fs$stream$stream_buffer */
var StreamBuffer;

/** @typedef function():void */
var EventCallback;

/**
 * @constructor @extends {AxiomStream} @implements {WritableStream}
 * @param {StreamBuffer} buffer
 */
export var WritableMemoryStream = function(buffer) {
  AxiomStream.call(this);

  /** @const @private @type {StreamBuffer} */
  this.buffer_ = buffer;

  /** @const @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
};

export default WritableMemoryStream;

WritableMemoryStream.prototype = Object.create(AxiomStream.prototype);

/**
 * Write an event to the stream.
 *
 * @override
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
WritableMemoryStream.prototype.write = function(value, opt_callback) {
  return this.buffer_.write(value, opt_callback);
};

/**
 * @override
 * @return {void}
 */
WritableMemoryStream.prototype.close = function() {
  this.onClose.fire();
};
