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
import BufferedStreamsSource from 'axiom/fs/stream/buffered_streams_source';
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

/** @typedef function():void */
var WriteCallback;

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
 * Handle a ReadableStream and a WritableStream over a generic connection
 * (abstract).
 *
 * @constructor
 * @implements {StreamsSource}
 * @param {!BufferedStreamsSource} source
 */
export var BufferedStreams = function(source) {
  /** @const @private @type {!BufferedStreamsSource} */
  this.source_ = source;
  /** @const @private @type {!Queue} */
  this.readQueue_ = new Queue();
  /** @const @private @type {!Queue} */
  this.writeQueue_ = new Queue();
  /** @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onReadable = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onEnd = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onFinish = new AxiomEvent();
  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableStreamSource(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableStreamSource(this);
  /** @private @type {!boolean} */
  this.paused_ = true;
  /** @private @type {!boolean} */
  this.ended_ = false;
  /** @private @type {!boolean} */
  this.sourceEnded_ = false;

  this.source_.onConnect.addListener(this.onSourceConnect_, this);
  this.source_.onMessage.addListener(this.onSourceMessage_, this);
  this.source_.onEnd.addListener(this.onSourceEnd_, this);
  this.source_.onClose.addListener(this.onSourceClose_, this);
};

export default BufferedStreams;

/**
 * @override
 */
BufferedStreams.prototype.pause = function() {
  this.paused_ = true;
};

/**
 * @override
 */
BufferedStreams.prototype.resume = function() {
  this.paused_ = false;
  this.flushReadQueue_();
};

/**
 * @override
 */
BufferedStreams.prototype.read = function() {
  if (!this.paused_)
    throw new AxiomError.Runtime('Cannot read: stream must be paused');

  return this.read_();
};

/**
 * @override
 */
BufferedStreams.prototype.write = function(value, opt_callback) {
  if (this.ended_)
    throw new AxiomError.Runtime('Cannot write: stream has been ended.');

  return this.write_(value, opt_callback);
};

/**
 * @override
 */
BufferedStreams.prototype.end = function() {
  if (this.ended_)
    return;

  this.flushWriteQueue_();
  this.ended_ = true;

  // Ensure we delivered all messages and connection is still open.
  switch(this.source_.getState()) {
    case BufferedStreamsSource.ConnectionState.CONNECTED:
      this.source_.end();
      this.onFinish.fire();
      break;

    case BufferedStreamsSource.ConnectionState.CONNECTING:
      break;

    case BufferedStreamsSource.ConnectionState.CLOSING:
    case BufferedStreamsSource.ConnectionState.CLOSED:
    default:
      throw new AxiomError.Runtime('Cannot end: the connection is closed.');
  }
};

/**
 * @override
 */
BufferedStreams.prototype.close = function(error) {
  this.writeQueue_.clear();
  this.readQueue_.clear();
  this.source_.close(error);
};

/**
 * @private
 * @return {void}
 */
BufferedStreams.prototype.flushReadQueue_ = function() {
  while (!this.paused_) {
    var item = this.read_();
    if (!item)
      break;

    this.onData.fire(item);
  }
};

/**
 * @private
 * @return {void}
 */
BufferedStreams.prototype.flushWriteQueue_ = function() {
  while(this.source_.getState() === BufferedStreamsSource.ConnectionState.CONNECTED) {
    var item = this.writeQueue_.dequeue();
    if (!item)
      break;

    if (item instanceof EventWithCallback) {
      this.source_.write(item.value, item.callback);
    } else {
      this.source_.write(item);
    }
  }
};

/**
 * @private
 * @return {*}
 */
BufferedStreams.prototype.read_ = function() {
  var value = this.readQueue_.dequeue();
  if (!value) {
    if (this.sourceEnded_) {
      this.onEnd.fire();
    }
  }
  return value;
};

/**
 * @private
 * @param {!*} value
 * @param {WriteCallback=} opt_callback
 * @return {void}
 */
BufferedStreams.prototype.write_ = function(value, opt_callback) {
  if (this.ended_)
    throw new AxiomError.Runtime('Cannot write: stream has been ended.');

  var item = value;
  if (opt_callback) {
    item = new EventWithCallback(value, opt_callback);
  }
  this.writeQueue_.enqueue(item);
  this.flushWriteQueue_();
};

/**
 * @private
 * @return {void}
 */
BufferedStreams.prototype.onSourceConnect_ = function() {
  if (this.source_.getState() !== BufferedStreamsSource.ConnectionState.CONNECTED)
    throw new AxiomError.Runtime('Stream should be connected');

  // Send all messages to peer
  this.flushWriteQueue_();

  // Note: Stream may have been ended before connection was opened.
  if (this.ended_) {
    this.source_.end();
    this.onFinish.fire();
  }
};

/**
 * @private
 * @param {*} error
 * @return {void}
 */
BufferedStreams.prototype.onSourceClose_ = function(error) {
  if (this.source_.getState() != BufferedStreamsSource.ConnectionState.CLOSED)
    throw new AxiomError.Runtime('Stream should be closed');

  this.writeQueue_.clear();
  this.readQueue_.clear();
  this.onClose.fire(error);
};

/**
 * @private
 * @return {void}
 */
BufferedStreams.prototype.onSourceEnd_ = function(error) {
  this.sourceEnded_ = true;
  // Don't delay event if read queue is empty
  if (this.readQueue_.empty()) {
    this.onEnd.fire();
  }
};

/**
 * @private
 * @param {*} data
 * @return {void}
 */
BufferedStreams.prototype.onSourceMessage_ = function(data) {
  // Don't enqueue value if the source notified us it ended.
  if (this.sourceEnded_)
    throw new AxiomError.Runtime('Stream should not send messages when ended');

  this.readQueue_.enqueue(data);
  if (this.paused_) {
    this.onReadable.fire();
  } else {
    this.flushReadQueue_();
  }
};
