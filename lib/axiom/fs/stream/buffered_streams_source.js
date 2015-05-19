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
var EventCallback;

/**
 * Abstraction over a duplex stream that can be used as the source of
 * a BufferedStreams implementation.
 *
 * @interface
 */
export var BufferedStreamsSource = function() {};

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
 * Writes a message to the source.
 *
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
BufferedStreamsSource.prototype.write = function(data) {};

/**
 * Closes the connection.
 *
 * @param {*} error
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
 * Fired by the source when the connection is established.
 *
 * @type {!AxiomEvent}
 */
BufferedStreamsSource.prototype.onConnect;

/**
 * Fired by the source when a message is received.
 *
 * @type {!AxiomEvent}
 */
BufferedStreamsSource.prototype.onMessage;

/**
 * Fired by the source when the connection is closed with an error.
 *
 * @type {!AxiomEvent}
 */
BufferedStreamsSource.prototype.onClose;

/**
 * Fired by the source when the connection is ended.
 *
 * @type {!AxiomEvent}
 */
BufferedStreamsSource.prototype.onEnd;
