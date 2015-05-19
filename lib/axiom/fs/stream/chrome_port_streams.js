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
import Completer from 'axiom/core/completer';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * Implementation of BufferedStreamsSource over a Chrome Port interface
 * (see https://developer.chrome.com/extensions/runtime#type-Port)
 *
 * @constructor
 * @implements {BufferedStreamsSource}
 */
export var ChromePortStreams = function() {
  /** @const @type {!AxiomEvent} */
  this.onConnect = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onMessage = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onEnd = new AxiomEvent();
  /** @private @type {!BufferedStreamsSource.ConnectionState} */
  this.connectionState_ = BufferedStreamsSource.ConnectionState.CONNECTING;
  /** @private @type {Port} */
  this.port_ = null;
  /** @private @type {?Completer} */
  this.completer_ = null;
  /** @const @private @type {BufferedStreams} */
  this.streams_ = new BufferedStreams(this);
  /** @const @type {!ReadableStream} */
  this.readableStream = this.streams_.readableStream;
  /** @const @type {!WritableStream} */
  this.writableStream = this.streams_.writableStream;

  // Bind event handlers
  this.onConnectingMessage_ = this.onConnectingMessage_.bind(this);
  this.onConnectingDisconnect_ = this.onConnectingDisconnect_.bind(this);
  this.onPortMessage_ = this.onPortMessage_.bind(this);
  this.onPortDisconnect_ = this.onPortDisconnect_.bind(this);
};

export default ChromePortStreams;

/**
 * @param {!Port} port
 * @param {!boolean} alreadyConnected
 * @return {Promise}
 */
ChromePortStreams.prototype.setPort = function(port, alreadyConnected) {
  if (this.port_)
    throw new AxiomError.Runtime('Port already set');

  this.port_ = port;

  if (alreadyConnected) {
    this.handleConnected_();
    return Promise.resolve();
  } else {
    this.connectionState_ = BufferedStreamsSource.ConnectionState.CONNECTING;
    port.onMessage.addListener(this.onConnectingMessage_);
    port.onDisconnect.addListener(this.onConnectingDisconnect_);
    this.completer_ = new Completer();
    return this.completer_.promise;
  }
};

/**
 * @return {void}
 */
ChromePortStreams.prototype.resume = function() {
  this.streams_.resume();
};

/**
 * @return {void}
 */
ChromePortStreams.prototype.onConnectingMessage_ = function(event) {
  this.cleanupConnectionListeners_();
  this.handleConnected_();
  this.completer_.resolve();
};

/**
 * @return {void}
 */
ChromePortStreams.prototype.onConnectingDisconnect_ = function(event) {
  this.connectionState_ = BufferedStreamsSource.ConnectionState.CLOSED;
  this.cleanupConnectionListeners_();
  var error = new AxiomError.Runtime('Error connecting to extension');
  this.port_ = null;
  this.onClose.fire(error);
  this.completer_.reject(error);
};

/**
 * @return {void}
 */
ChromePortStreams.prototype.onPortDisconnect_ = function(event) {
  this.connectionState_ = BufferedStreamsSource.ConnectionState.CLOSED;
  this.port_.onMessage.removeListener(this.onPortMessage_);
  this.port_.onDisconnect.removeListener(this.onPortDisconnect_);
  this.port_ = null;
  this.onClose.fire(new AxiomError.Runtime('Port has been disconnected'));
};

/**
 * @return {void}
 */
ChromePortStreams.prototype.onPortMessage_ = function(message) {
  // TODO(rpaquay): Handle `end` message.
  if (message.data) {
    this.onMessage.fire(message.data);
  } else if (message.end) {
    this.onEnd.fire();
  } else {
    // TODO(rpaqauay): Unknown message
  }
};

/**
 * @return {void}
 */
ChromePortStreams.prototype.handleConnected_ = function() {
  this.connectionState_ = BufferedStreamsSource.ConnectionState.CONNECTED;
  this.port_.onMessage.addListener(this.onPortMessage_);
  this.port_.onDisconnect.addListener(this.onPortDisconnect_);
  this.onConnect.fire();
};

/**
 * @return {void}
 */
ChromePortStreams.prototype.cleanupConnectionListeners_ = function() {
  this.port_.onMessage.removeListener(this.onConnectingMessage_);
  this.port_.onDisconnect.removeListener(this.onConnectingDisconnect_);
};

/**
 * @override
 */
ChromePortStreams.prototype.getState = function() {
  return this.connectionState_;
};

/**
 * @override
 */
ChromePortStreams.prototype.write = function(value, opt_callback) {
  this.port_.postMessage({data: value});
  if (opt_callback) {
    opt_callback();
  }
};

/**
 * @override
 */
ChromePortStreams.prototype.end = function() {
  this.port_.postMessage({end: true});
};

/**
 * @override
 * @return {void}
 */
ChromePortStreams.prototype.close = function(error) {
  this.port_.disconnect();
  this.connectionState_ = BufferedStreamsSource.ConnectionState.CLOSED;
  this.onClose.fire(error);
};
