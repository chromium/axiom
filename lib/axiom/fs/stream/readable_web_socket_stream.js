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

import AxiomStream from 'axiom/fs/stream/axiom_stream';

/** @typedef AxiomEvent$$module$axiom$core$event */
var AxiomEvent;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef WebSocketStreams$$module$axiom$fs$stream$web_socket_streams */
var WebSocketStreams;

/**
 * @constructor @extends {AxiomStream} @implements {ReadableStream}
 * @param {WebSocketStreams} streams
 */
export var ReadableWebSocketStream = function(streams) {
  AxiomStream.call(this);
  /** @const @private @type {WebSocketStreams} */
  this.streams_ = streams;
  /** @const @type {!AxiomEvent} */
  this.onData = streams.onData;
  /** @const @type {!AxiomEvent} */
  this.onReadable = streams.onReadable;
};

export default ReadableWebSocketStream;

ReadableWebSocketStream.prototype = Object.create(AxiomStream.prototype);

/**
 * @override
 * @return {void}
 */
ReadableWebSocketStream.prototype.pause = function() {
  return this.streams_.pause();
};

/**
 * @override
 * @return {void}
 */
ReadableWebSocketStream.prototype.resume = function() {
  return this.streams_.resume();
};

/**
 * @override
 * @return {*}
 */
ReadableWebSocketStream.prototype.read = function() {
  return this.streams_.read();
};
