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
 * Expose a ReadableStream and a WritableStream over a client WebSocket from
 * node.js.
 *
 * @constructor
 * @implements {StreamsSource}
 * @param {*} webSocket
 */
export var NodeWebSocketStreams = function(webSocket) {
  /** @type {*} */
  this.webSocket = webSocket;
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
  /** @type {!AxiomEvent} */
  this.onFlush = new AxiomEvent();
  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableStreamSource(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableStreamSource(this);

  this.webSocket.on('message', function (message) {
    this.onSocketMessage_(message);
  }.bind(this));

  this.webSocket.on('close', function () {
    this.onSocketClose_();
  }.bind(this));
};

export default NodeWebSocketStreams;

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.close = function() {
  this.webSocket.close();
};

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.pause = function() {
  this.paused_ = true;
};

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.resume = function() {
  this.paused_ = false;
  this.flushReadQueue_();
};

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
NodeWebSocketStreams.prototype.read = function() {
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
NodeWebSocketStreams.prototype.write = function(value, opt_callback) {
  switch(this.webSocket.readyState) {
    case 0 /* CONNECTING */:
    case 1 /* OPEN */:
      var item = value;
      if (opt_callback) {
        item = new EventWithCallback(value, opt_callback);
      }
      this.writeQueue_.enqueue(item);
      this.flushWriteQueue_();
      break;

    case 2 /* CLOSING */:
    case 3 /* CLOSE */:
    default:
      throw new AxiomError.Runtime('Cannot write: the web socket is closed.');
  }
};

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.flush = function() {
  this.flushWriteQueue_();
  this.flushReadQueue_();
  this.onFlush.fire();
};

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.onSocketClose_ = function() {
  this.onClose.fire(new AxiomError.Runtime('Socket has closed'));
};

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.onSocketMessage_ = function(data) {
  this.readQueue_.enqueue(data);
  if (this.paused_) {
    this.onReadable.fire();
  } else {
    this.flushReadQueue_();
  }
};

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.flushReadQueue_ = function() {
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
NodeWebSocketStreams.prototype.flushWriteQueue_ = function() {
  while(this.webSocket.readyState === 1 /* OPEN */) {
    var item = this.writeQueue_.dequeue();
    if (!item)
      break;

    if (item instanceof EventWithCallback) {
      this.webSocket.send(/** @type {string} */(item.value));
      // Note: Websocket API does not provide a notification when data is
      // actually sent to the peer, so we invoke the callback right away.
      item.callback();
    } else {
      this.webSocket.send(/** @type {string} */(item));
    }
  }
};

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
NodeWebSocketStreams.prototype.read_ = function() {
  return this.readQueue_.dequeue();
};
