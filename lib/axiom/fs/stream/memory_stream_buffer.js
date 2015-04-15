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
import ReadableMemoryStream from 'axiom/fs/stream/readable_memory_stream';
import WritableMemoryStream from 'axiom/fs/stream/writable_memory_stream';
import StreamBuffer from 'axiom/fs/stream/stream_buffer';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * Implementation of streams over an in-memory array.
 *
 * @constructor @extends {StreamBuffer}
 */
export var MemoryStreamBuffer = function() {
  StreamBuffer.call(this);

  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableMemoryStream(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableMemoryStream(this);

  this.writableStream.onFinish.listenOnce(function() {
    // This will fire and event chain onClose -> this.readableStream.onEnd.
    StreamBuffer.prototype.close.call(this);
  }.bind(this));
};

export default MemoryStreamBuffer;

MemoryStreamBuffer.prototype = Object.create(StreamBuffer.prototype);

/**
 * @override
 * @return {void}
 */
MemoryStreamBuffer.prototype.close = function() {
  // This will indirectly fire an event chain:
  // this.writableStream.onFinish -> this.onClose -> this.readableStream.onEnd. 
  this.writableStream.end();
};
