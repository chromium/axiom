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
 * Expose a ReadableStream and a WritableStream over a client WebSocket from
 * node.js.
 *
 * @constructor
 * @implements {BufferedStreamsSource}
 * @param {*} webSocket
 */
export var NodeWebSocketStreams = function(webSocket) {
  /** @private @type {*} */
  this.webSocket_ = webSocket;
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

  this.onSocketMessage_ = this.onSocketMessage_.bind(this);
  this.onSocketClose_ = this.onSocketClose_.bind(this);
  this.onSocketError_ = this.onSocketError_.bind(this);

  this.webSocket_.on('message', this.onSocketMessage_);
  this.webSocket_.on('close', this.onSocketClose_);
  this.webSocket_.on('error', this.onSocketError_);
};

export default NodeWebSocketStreams;

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.resume = function() {
  this.streams_.resume();
};

/**
 * @return {void}
 */
NodeWebSocketStreams.prototype.onSocketError_ = function() {
  // TODO(rpaquay): Is this a close?
};

/**
 * @private
 * @return {void}
 */
NodeWebSocketStreams.prototype.onSocketClose_ = function(closeEvent) {
  if (closeEvent.wasClean) {
    this.onEnd.fire();
  }
  else {
    this.onClose.fire(
        new AxiomError.Runtime('Socket has closed: ' + closeEvent.reason));
  }
};

/**
 * @private
 * @return {void}
 */
NodeWebSocketStreams.prototype.onSocketMessage_ = function(data) {
  this.onMessage.fire(data);
};

/**
 * @override
 */
NodeWebSocketStreams.prototype.getState = function() {
  if (!this.webSocket_)
    return BufferedStreamsSource.ConnectionState.CLOSED;

  switch(this.webSocket_.readyState) {
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
NodeWebSocketStreams.prototype.write = function(value, opt_callback) {
  // TODO(rpaquay): value must be (ArrayBuffer|ArrayBufferView|null|string)
  this.webSocket_.send(/** @type {string} */(value));
  // Note: Websocket API does not provide a notification when data is
  // actually sent to the peer, so we invoke the callback right away.
  if (opt_callback) {
    opt_callback();
  }
};

/**
 * @override
 */
NodeWebSocketStreams.prototype.end = function() {
  // Note: This is a "clean" close, so the peer will raise a "onEnd" event.
  this.webSocket_.close();
  this.webSocket_ = null;
};

/**
 * @override
 * @return {void}
 */
NodeWebSocketStreams.prototype.close = function(error) {
  // TODO(rpaquay): Send error to the peer
  // TODO(rpaquay): Verify onSocketClose handler is called
  this.webSocket_.close();
  this.webSocket_ = null;
};
