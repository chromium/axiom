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
import GenericStreams from 'axiom/fs/stream/generic_streams';
import EventWithCallback from 'axiom/fs/stream/generic_streams';

/**
 * Extend a GenericStreams for use over a browser WebSocket.
 *
 * @constructor
 * @extends {GenericStreams}
 */
export var WebSocketStreams = function() {
  GenericStreams.call(this);

  /** @type {WebSocket} */
  this.webSocket = null;
};

WebSocketStreams.prototype = Object.create(GenericStreams.prototype);

export default WebSocketStreams;

/**
 * Open a WebSocketStream at given URL.
 *
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
      this.handleConnected_();
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
 * @protected
 * @param {EventWithCallback|string} item
 * @return {void}
 */
WebSocketStreams.prototype.handleSend_ = function(item) {
  GenericStreams.prototype.handleSend_.call(this, item);

  if (item instanceof EventWithCallback) {
    this.webSocket.send(/* string */(item.value));
    // Note: Websocket API does not provide a notification when data is
    // actually sent to the peer, so we invoke the callback right away.
    item.callback();
  } else {
    this.webSocket.send(/** @type {string} */(item));
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
  this.handleClose_();
};

/**
 * @return {void}
 */
WebSocketStreams.prototype.onSocketMessage_ = function(event) {
  this.handleReceive_(event.data);
};

/**
 * Return the state of the connection.
 *
 * @protected
 */
WebSocketStreams.prototype.getState_ = function() {
  switch(this.webSocket.readyState) {
    case 0:
      return GenericStreams.ConnectionState.CONNECTING;
    case 1:
      return GenericStreams.ConnectionState.CONNECTED;
    case 2:
      return GenericStreams.ConnectionState.CLOSING;
    case 3:
      return GenericStreams.ConnectionState.CLOSED;
  }
}

