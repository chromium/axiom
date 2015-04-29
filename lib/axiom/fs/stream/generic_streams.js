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
 * Handle a ReadableStream and a WritableStream over a generic connection (abstract).
 *
 * @constructor
 * @implements {StreamsSource}
 */
export var GenericStreams = function() {
  /** @private @type {boolean} */
  this.paused_ = true;
  /** @const @private @type {Queue} */
  this.readQueue_ = new Queue();
  /** @const @private @type {Queue} */
  this.writeQueue_ = new Queue();
  /** @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onReadable = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableStreamSource(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableStreamSource(this);
};

export default GenericStreams;

/**
 * @return {void}
 */
GenericStreams.prototype.pause = function() {
  this.paused_ = true;
};

/**
 * @return {void}
 */
GenericStreams.prototype.resume = function() {
  this.paused_ = false;
  this.flushReadQueue_();
};

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
GenericStreams.prototype.read = function() {
  if (!this.paused_) {
    throw new AxiomError.Runtime('Cannot read: stream must be paused');
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
GenericStreams.prototype.write = function(value, opt_callback) {
  switch(this.getState_()) {
    case GenericStreams.ConnectionState.CONNECTING:
    case GenericStreams.ConnectionState.CONNECTED:
      var item = value;
      if (opt_callback) {
        item = new EventWithCallback(value, opt_callback);
      }
      this.writeQueue_.enqueue(item);
      this.flushWriteQueue_();
      break;

    case GenericStreams.ConnectionState.CLOSING:
    case GenericStreams.ConnectionState.CLOSED:
    default:
      throw new AxiomError.Runtime('Cannot write: the connection is closed.');
  }
};

/**
 * @return {void}
 */
GenericStreams.prototype.flushReadQueue_ = function() {
  while (!this.paused_) {
    var item = this.read_();
    if (!item)
      break;

    this.onData.fire(item);
  }
};

/**
 * @return {void}
 */
GenericStreams.prototype.flushWriteQueue_ = function() {
  while(this.getState_() === GenericStreams.ConnectionState.CONNECTED) {
    var item = this.writeQueue_.dequeue();
    if (!item)
      break;
    this.handleSend_(item);
  }
};

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
GenericStreams.prototype.read_ = function() {
  return this.readQueue_.dequeue();
};

/**
 * Connection states.
 * @enum {number}
 */
 GenericStreams.ConnectionState = {
  CONNECTING: 0,
  CONNECTED: 1,
  CLOSING: 2,
  CLOSED: 3,
};

/**
 * @protected
 * @param {*} data
 * @return {void}
 */
GenericStreams.prototype.handleReceive_ = function(data) {
  this.readQueue_.enqueue(data);
  if (this.paused_) {
    this.onReadable.fire();
  } else {
    this.flushReadQueue_();
  }
};

/**
 * @protected
 * @param {*} data
 * @return {void}
 */
GenericStreams.prototype.handleSend_ = function(item) {
  if (this.getState_ === GenericStreams.prototype.getState_)
      throw new AxiomError.AbstractCall();
};

/**
 * @protected
 * @return {void}
 */
GenericStreams.prototype.handleConnected_ = function() {
  this.flushWriteQueue_();
}

/**
 * @protected
 * @return {void}
 */
GenericStreams.prototype.handleClose_ = function() {
  this.onClose.fire();
}

/**
 * Return the state of the connection.
 *
 * @return {GenericStreams.ConnectionState}
 * @protected
 */
GenericStreams.prototype.getState_ = function() {
  if (this.getState_ === GenericStreams.prototype.getState_)
      throw new AxiomError.AbstractCall();
}
