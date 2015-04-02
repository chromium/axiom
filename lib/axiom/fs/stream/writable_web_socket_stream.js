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

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/** @typedef WebSocketStreams$$module$axiom$fs$stream$web_socket_streams */
var WebSocketStreams;

/** @typedef function():void */
var EventCallback;

/**
 * @constructor @extends {AxiomStream} @implements {WritableStream}
 * @param {WebSocketStreams} buffer
 */
export var WritableWebSocketStream = function(streams) {
  AxiomStream.call(this);
  /** @const @private @type {WebSocketStreams} */
  this.streams_ = streams;
};

export default WritableWebSocketStream;

WritableWebSocketStream.prototype = Object.create(AxiomStream.prototype);

/**
 * Write an event to the stream.
 *
 * @override
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
WritableWebSocketStream.prototype.write = function(value, opt_callback) {
  return this.streams_.write(value, opt_callback);
};
