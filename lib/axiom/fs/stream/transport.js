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

import AxiomEvent from 'axiom/core/event';
import Ephemeral from 'axiom/core/ephemeral';

/** @typedef Message$$module$axiom$fs$stream$message */
var Message;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * Abstraction over sending/receiving of Message instances over a pair
 * of streams.
 *
 * @constructor @extends {Ephemeral}
 * @param {string} name  an arbitrary name used for debugging
 * @param {ReadableStream} inStream
 * @param {WritableStream} outStream
 */
export var Transport = function(name, inStream, outStream) {
  Ephemeral.call(this);

  /** @const @type {ReadableStream}  */
  this.inStream_ = inStream;

  /** @const @type {WritableStream} */
  this.outStream_ = outStream;

  /** @const @type {AxiomEvent} */
  this.onMessage = new AxiomEvent();

  this.inStream_.onData.addListener(this.onData_, this);
};

export default Transport;

Transport.prototype = Object.create(Ephemeral.prototype);

/**
 * Sends a message to the peer.
 * @param {Message} message
 * @return {void}
 */
Transport.prototype.sendMessage = function(message) {
  this.outStream_.write(JSON.stringify(message));
};

/**
 * @param {*} data
 * @return {void}
 */
Transport.prototype.onData_ = function(data) {
  var message = JSON.parse(/** @type {string} */(data));
  this.onMessage.fire(message);
};
