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
 * Expose a ReadableStream and a WritableStream over a browser WebSocket.
 *
 * @constructor
 * @implements {StreamsSource}
 * @param {WebSocket} webSocket
 */
export var WebSocketStreams = function() {
  /** @type {WebSocket} */
  this.webSocket = null;
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

export default WebSocketStreams;

/**
 * @param {string} url
 * @return {Promise}
 */
WebSocketStreams.prototype.open = function(url) {
  return new Promise(function(resolve, reject) {
    this.webSocket = new WebSocket(url);

    this.webSocket.onopen = function() {
      this.webSocket.onmessage = this.onSocketMessage_.bind(this);
      this.webSocket.onerror = this.onSocketError_.bind(this);
      this.webSocket.onclose = this.onSocketClose_.bind(this);
      this.flushWriteQueue_();
      resolve();
    }.bind(this);

    this.webSocket.onclose = function(ev) {
      reject(new AxiomError.Runtime(
          'Error opening WebSocket (error code: ' + ev.code + ')'));
    }.bind(this);

  }.bind(this));
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.close = function() {
  if (!this.webSocket)
    return;
  this.webSocket.close();
  this.webSocket = null;
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.pause = function() {
  this.paused_ = true;
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.resume = function() {
  this.paused_ = false;
  this.flushReadQueue_();
};

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
WebSocketStreams.prototype.read = function() {
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
WebSocketStreams.prototype.write = function(value, opt_callback) {
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
WebSocketStreams.prototype.onSocketError_ = function() {
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.onSocketClose_ = function() {
  this.onClose.fire();
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.onSocketMessage_ = function(event) {
  var data = event.data;
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
WebSocketStreams.prototype.flushReadQueue_ = function() {
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
WebSocketStreams.prototype.flushWriteQueue_ = function() {
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
WebSocketStreams.prototype.read_ = function() {
  return this.readQueue_.dequeue();
};
