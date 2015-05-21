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
import BufferedStreams from 'axiom/fs/stream/buffered_streams';
import BufferedStreamsSource from 'axiom/fs/stream/buffered_streams_source';
import EventWithCallback from 'axiom/fs/stream/buffered_streams';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * Extend a BufferedStreams for use over a browser WebSocket.
 *
 * @constructor
 * @implements {BufferedStreamsSource}
 */
export var WebSocketStreams = function() {
  /** @type {WebSocket} */
  this.webSocket = null;
  /** @const @type {!AxiomEvent} */
  this.onConnect = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onMessage = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onEnd = new AxiomEvent();
  /** @const @private @type {BufferedStreams} */
  this.streams_ = new BufferedStreams(this);
  /** @const @type {!ReadableStream} */
  this.readableStream = this.streams_.readableStream;
  /** @const @type {!WritableStream} */
  this.writableStream = this.streams_.writableStream;
};

export default WebSocketStreams;

/**
 * Open a WebSocketStream at given URL.
 *
 * @param {string} url
 * @return {Promise}
 */
WebSocketStreams.prototype.open = function(url) {
  return new Promise(function(resolve, reject) {
    if (this.webSocket)
      return reject(new AxiomError.Runtime('WebSocket already connected'));
    this.webSocket = new WebSocket(url);

    this.webSocket.onopen = function() {
      this.webSocket.onmessage = this.onSocketMessage_.bind(this);
      this.webSocket.onerror = this.onSocketError_.bind(this);
      this.webSocket.onclose = this.onSocketClose_.bind(this);
      this.onConnect.fire();
      resolve();
    }.bind(this);

    this.webSocket.onclose = function(ev) {
      this.webSocket = null;
      var error = new AxiomError.Runtime(
          'Error opening WebSocket (error code: ' + ev.code + ')')
      this.onClose.fire(error);
      reject(error);
    }.bind(this);
  }.bind(this));
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.resume = function() {
  this.streams_.resume();
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.onSocketError_ = function() {
  // TODO(rpaquay): Is this a close?
};

/**
 * See http://dev.w3.org/html5/websockets/#closeevent
 * @return {void}
 */
WebSocketStreams.prototype.onSocketClose_ = function(closeEvent) {
  if (closeEvent.wasClean) {
    this.onEnd.fire();
  }
  else {
    this.onClose.fire(
        new AxiomError.Runtime('Socket has closed: ' + closeEvent.reason));
  }
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.onSocketMessage_ = function(event) {
  this.onMessage.fire(event.data);
};

/**
 * @override
 */
WebSocketStreams.prototype.getState = function() {
  if (!this.webSocket)
    return BufferedStreamsSource.ConnectionState.CLOSED;

  switch(this.webSocket.readyState) {
    case 0:
      return BufferedStreamsSource.ConnectionState.CONNECTING;
    case 1:
      return BufferedStreamsSource.ConnectionState.CONNECTED;
    case 2:
      return BufferedStreamsSource.ConnectionState.CLOSING;
    case 3:
      return BufferedStreamsSource.ConnectionState.CLOSED;
  }
};

/**
 * @override
 */
WebSocketStreams.prototype.write = function(value, opt_callback) {
  // TODO(rpaquay): value must be (ArrayBuffer|ArrayBufferView|null|string)
  this.webSocket.send(/** @type {string} */(value));
  // Note: Websocket API does not provide a notification when data is
  // actually sent to the peer, so we invoke the callback right away.
  if (opt_callback) {
    opt_callback();
  }
};

/**
 * @override
 */
WebSocketStreams.prototype.end = function() {
  this.webSocket.close();
  this.webSocket = null;
};

/**
 * @override
 * @return {void}
 */
WebSocketStreams.prototype.close = function(error) {
  // TODO(rpaquay): Send error to the peer
  // TODO(rpaquay): Verify onSocketClose handler is called
  this.webSocket.close();
  this.webSocket = null;
};
