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
 * @constructor
 */
export var StreamBuffer = function() {
  /** @private @type {boolean} */
  this.paused_ = true;
  /** @const @private @type {Queue} */
  this.events_ = new Queue();

  /** @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onReadable = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onFlush = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
};

export default StreamBuffer;

/**
 * @return {void}
 */
StreamBuffer.prototype.pause = function() {
  this.paused_ = true;
};

/**
 * @return {void}
 */
StreamBuffer.prototype.resume = function() {
  this.paused_ = false;
  this.flushEvents_();
};

/**
 * Consume one event from the stream. Return undefined if the stream is empty.
 *
 * @return {*}
 */
StreamBuffer.prototype.read = function() {
  if (!this.paused_) {
    throw new AxiomError.Runtime('Cannot read: stream must be paused');
  }
  return this.read_();
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
StreamBuffer.prototype.write = function(value, opt_callback) {
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
 * Can be overridden by subclasses in case flushing is non-trivial.
 *
 * @return {void}
 */
StreamBuffer.prototype.flush = function() {
  if (!this.paused_) {
    this.flushEvents_();
  }
  this.onFlush.fire();
};

/**
 * Can be overridden by subclasses in case closing is non-trivial.
 *
 * @param {*} error
 * @return {void}
 */
StreamBuffer.prototype.close = function(error) {
  if (!this.paused_) {
    this.flushEvents_();
  }
  this.onClose.fire(error);
};

/**
 * @protected
 * @return {void}
 */
StreamBuffer.prototype.flushEvents_ = function() {
  while (!this.paused_) {
    var item = this.read_();
    if (!item)
      break;

    this.onData.fire(item);
  }
};

/**
 * Consume one event from the stream. Return undefined if the stream is empty.
 *
 * @return {*}
 */
StreamBuffer.prototype.read_ = function() {
  var item = this.events_.dequeue();
  if (item instanceof EventWithCallback) {
    item.callback();
    return item.value;
  } else {
    return item;
  }
};
