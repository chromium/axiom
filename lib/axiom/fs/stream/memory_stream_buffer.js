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
import ReadableStream from 'axiom/fs/stream/readable_stream';
import WritableStream from 'axiom/fs/stream/writable_stream';
import ReadableMemoryStream from 'axiom/fs/stream/readable_memory_stream';
import WritableMemoryStream from 'axiom/fs/stream/writable_memory_stream';

/** @typedef function():void */
var EventCallback;

/** @typedef function(*):void */
var DataCallback;

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
 * @constructor
 */
export var MemoryStreamBuffer = function() {
  /** @private @type {boolean} */
  this.paused_ = true;
  /** @const @private @type {Queue} */
  this.events_ = new Queue();
  /** @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableMemoryStream(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableMemoryStream(this);
};

export default MemoryStreamBuffer;

/**
 * @return {void}
 */
MemoryStreamBuffer.prototype.pause = function() {
  this.paused_ = true;
}

/**
 * @return {void}
 */
MemoryStreamBuffer.prototype.resume = function() {
  this.paused_ = false;
  this.flushEvents_();
}

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
MemoryStreamBuffer.prototype.read = function() {
  if (!this.paused_) {
    throw new AxiomError.Runtime('Cannot read: stream must be paused')
  }
  return this.read_();
};

/**
 * Write data into the stream (for implementers of the stream only).
 * Invoke the "onData" callback for all pending events if the callback is set.
 *
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
MemoryStreamBuffer.prototype.write = function(value, opt_callback) {
  var item = value;
  if (opt_callback) {
    item = new EventWithCallback(value, opt_callback);
  }
  this.events_.enqueue(item);
  if (!this.paused_) {
    this.flushEvents_();
  }
};

/**
 * @return {void}
 */
MemoryStreamBuffer.prototype.flushEvents_ = function() {
  while (!this.paused_) {
    var item = this.read_();
    if (!item)
      break;

    this.onData.fire(item);
  }
}

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
MemoryStreamBuffer.prototype.read_ = function() {
  var item = this.events_.dequeue();
  if (item instanceof EventWithCallback) {
    item.callback();
    return item.value;
  } else {
    return item;
  }
};
