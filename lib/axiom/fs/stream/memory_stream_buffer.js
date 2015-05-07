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
import Queue from 'axiom/fs/stream/queue';
import ReadableStreamSource from 'axiom/fs/stream/readable_stream_source';
import WritableStreamSource from 'axiom/fs/stream/writable_stream_source';
import StreamBuffer from 'axiom/fs/stream/stream_buffer';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
var StreamsSource;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * Implementation of streams over an in-memory array.
 *
 * @constructor
 * @extends {StreamBuffer}
 * @implements {StreamsSource}
 */
export var MemoryStreamBuffer = function() {
  StreamBuffer.call(this);

  /** @type {!AxiomEvent} */
  this.onEnd = new AxiomEvent();

  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableStreamSource(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableStreamSource(this);

  this.writableStream.onFinish.listenOnce(function() {
    // This will fire an event chain:
    // this.onFlush -> this.readableStream.onEnd.
    StreamBuffer.prototype.flush.call(this);
  }.bind(this));

  this.writableStream.onClose.listenOnce(function(error) {
    // This will fire an event chain:
    // this.onClose -> this.readableStream.onClose.
    StreamBuffer.prototype.close.call(this, error);
  }.bind(this));
};

export default MemoryStreamBuffer;

MemoryStreamBuffer.prototype = Object.create(StreamBuffer.prototype);

/**
 * @override
 * @return {void}
 */
MemoryStreamBuffer.prototype.flush = function() {
  // This will fire an event chain:
  // this.writableStream.onFinish -> this.onFlush -> this.readableStream.onEnd. 
  this.writableStream.end();
  this.onEnd.fire();
};

/**
 * @override
 * @param {*} error
 * @return {void}
 */
MemoryStreamBuffer.prototype.close = function(error) {
  // This will fire an event chain:
  // this.writableStream.onClose -> this.onClose -> this.readableStream.onClose. 
  this.writableStream.close(error);
  //this.onClose.fire();
};
