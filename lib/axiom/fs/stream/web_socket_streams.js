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
import ReadableWebSocketStream from 'axiom/fs/stream/readable_web_socket_stream';
import WritableWebSocketStream from 'axiom/fs/stream/writable_web_socket_stream';

/** @typedef function():void */
var EventCallback;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

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
 * Expose a ReadableStream and a WritableStream over a web socket client.
 *
 * @constructor
 * @param {WebSocket} webSocket
 */
export var WebSocketStreams = function(webSocket) {
  /** @const @type {WebSocket} */
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
  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableWebSocketStream(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableWebSocketStream(this);

  this.webSocket.onopen = this.onOpen_.bind(this);
  this.webSocket.onclose = this.onClose_.bind(this);
  this.webSocket.onmessage = this.onMessage_.bind(this);
  this.webSocket.onerror = this.onError_.bind(this);
};

export default WebSocketStreams;

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
WebSocketStreams.prototype.onOpen_ = function() {
  this.flushWriteQueue_();
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.onClose_ = function() {
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.onError_ = function() {
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.onMessage_ = function(event) {
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
