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
import ChromePortStreams from 'axiom/fs/stream/chrome_port_streams';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * Provides streams to exchange messages with a Chrome extension.
 *
 * @constructor
 */
export var ExtensionStreams = function() {
  /** @const @private @type {!ChromePortStreams} */
  this.streams_ = new ChromePortStreams();
  /** @const @type {!ReadableStream} */
  this.readableStream = this.streams_.readableStream;
  /** @const @type {!WritableStream} */
  this.writableStream = this.streams_.writableStream;

  /** @type {?string} */
  this.appId = null;

  /** @const @type {!AxiomEvent} */
  this.onConnected = new AxiomEvent();

  /** @private @type {boolean} */
  this.listening_ = false;
};

export default ExtensionStreams;

/**
 * Open a connection to an extension given its appId
 *
 * @param {!string} appId The appId where receiving ExtensionStream lives.
 * @return {Promise}
 */
ExtensionStreams.prototype.open = function(appId) {
  if (this.listening_)
    throw new AxiomError.Runtime('Cannot connect if listening.');

  this.appId_ = appId;
  var port = chrome.runtime.connect(appId);
  return this.streams_.open(port, false);
};

/**
 * Listen (as an extension) for a connection.
 *
 * @return {void}
 */
ExtensionStreams.prototype.listen = function() {
  if (this.listening_)
    throw new AxiomError.Runtime('Connect listen if already listening.');

  if (this.appId_)
    throw new AxiomError.Runtime('Cannot listen if already connected.');

  chrome.runtime.onConnectExternal.addListener(
      this.onConnectExternal_.bind(this));
  this.listening_ = true;
};

/**
 * @return {void}
 */
ExtensionStreams.prototype.resume = function() {
  this.streams_.resume();
};

/**
 * @param {!Port} port
 * @return {void}
 */
ExtensionStreams.prototype.onConnectExternal_ = function(port) {
  this.streams_.open(port, false).then(function() {
    port.postMessage({command: 'connected'});
    this.onConnected.fire(null);
  });
};
