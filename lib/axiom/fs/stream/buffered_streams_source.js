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

/** @typedef AxiomEvent$$module$axiom$core$event */
var AxiomEvent;

/** @typedef function():void */
var WriteCallback;

/**
 * Abstraction over a duplex stream that can be used as the source of
 * a BufferedStreams implementation.
 *
 * @interface
 */
export var BufferedStreamsSource = function() {};

export default BufferedStreamsSource;

/**
 * Connection states.
 * @enum {number}
 */
BufferedStreamsSource.ConnectionState = {
  CONNECTING: 0,
  CONNECTED: 1,
  CLOSING: 2,
  CLOSED: 3,
};

/**
 * Return the state of the connection.
 *
 * @return {BufferedStreamsSource.ConnectionState}
 */
BufferedStreamsSource.prototype.getState = function() {};


/**
 * Sends a message to the peer.
 *
 * @param {!*} value
 * @param {WriteCallback=} opt_callback
 * @return {void}
 */
BufferedStreamsSource.prototype.write = function(value, opt_callback) {};

/**
 * Signals the peer no more write will happen.
 *
 * @return {void}
 */
BufferedStreamsSource.prototype.end = function() {};

/**
 * Closes the connection with an error.
 *
 * @param {*} error
 * @return {void}
 */
BufferedStreamsSource.prototype.close = function(error) {};

/**
 * Fired when the connection with the peer is established.
 *
 * @type {!AxiomEvent}
 */
BufferedStreamsSource.prototype.onConnect;

/**
 * Fired when a message from the peer is received.
 *
 * @type {!AxiomEvent}
 */
BufferedStreamsSource.prototype.onMessage;

/**
 * Fired when the peer close the connection with an error, or when the
 * underlying connection closed with an error.
 *
 * @type {!AxiomEvent}
 */
BufferedStreamsSource.prototype.onClose;

/**
 * Fired when the peer signaled no more messages will be sent.
 *
 * @type {!AxiomEvent}
 */
BufferedStreamsSource.prototype.onEnd;
