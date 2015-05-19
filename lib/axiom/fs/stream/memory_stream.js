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

/** @typedef function():void */
var EventCallback;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
var StreamsSource;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

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
 * @implements {StreamsSource}
 */
export var MemoryStream = function() {
  /** @private @type {boolean} */
  this.ended_ = false;
  /** @private @type {boolean} */
  this.paused_ = true;
  /** @const @private @type {Queue} */
  this.events_ = new Queue();

  /** @const @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onReadable = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onEnd = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onFinish = new AxiomEvent();

  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableStreamSource(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableStreamSource(this);
};

export default MemoryStream;

/**
 * @return {void}
 */
MemoryStream.prototype.pause = function() {
  this.paused_ = true;
};

/**
 * @return {void}
 */
MemoryStream.prototype.resume = function() {
  this.paused_ = false;
  this.flushEvents_();
};

/**
 * Consume one event from the stream. Return undefined if the stream is empty.
 *
 * @return {*}
 */
MemoryStream.prototype.read = function() {
  if (!this.paused_)
    throw new AxiomError.Runtime('Cannot read: stream must be paused');

  return this.dequeueEvent_();
};

/**
 * Write data into the stream (for implementers of the stream only).
 * Depending on the state (paused/flowing), fire a single onReadable event or
 * or flush all the pending events, firing an onData event for each one.
 * If opt_callback is set, it will be called after the requested value gets
 * written to the underlying stream.
 *
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
MemoryStream.prototype.write = function(value, opt_callback) {
  this.enqueueEvent_(value, opt_callback);
};

/**
 * Can be overridden by subclasses in case closing is non-trivial.
 *
 * @param {*} error
 * @return {void}
 */
MemoryStream.prototype.close = function(error) {
  this.events_.clear();
  this.onClose.fire(error);
};

/**
 * Signal there is no more data to be written to the stream.
 *
 * @return {void}
 */
MemoryStream.prototype.end = function() {
  this.ended_ = true;
  this.flushEvents_();
};

/**
 * @private
 * @return {void}
 */
MemoryStream.prototype.flushEvents_ = function() {
  while (!this.paused_) {
    var item = this.dequeueEvent_();
    if (!item)
      break;

    this.onData.fire(item);
  }
};

/**
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
MemoryStream.prototype.enqueueEvent_ = function(value, opt_callback) {
  if (this.ended_)
    throw new AxiomError.Runtime('Cannot write: stream has been ended.');

  var item = value;
  if (opt_callback) {
    item = new EventWithCallback(value, opt_callback);
  }
  this.events_.enqueue(item);
  if (this.paused_) {
    this.onReadable.fire();
  } else {
    this.flushEvents_();
  }
};

/**
 * Consume one event from the stream. Return undefined if the stream is empty.
 *
 * @private
 * @return {*}
 */
MemoryStream.prototype.dequeueEvent_ = function() {
  var item = this.events_.dequeue();

  if (!item) {
    if (this.ended_) {
      // Note: This is guaranteed to fire only once because we don't allow
      // enqueueing additional events once end() has been called.
      this.onFinish.fire();
      this.onEnd.fire();
    }
    return item;
  }

  if (item instanceof EventWithCallback) {
    item.callback();
    return item.value;
  } else {
    return item;
  }
};
