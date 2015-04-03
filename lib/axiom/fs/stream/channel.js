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
import Completer from 'axiom/core/completer';
import Ephemeral from 'axiom/core/ephemeral';

import Message from 'axiom/fs/stream/message';

/** @typedef Transport$$module$axiom$fs$stream$transport */
var Transport;

/**
 * Abstraction over processing request/responses over a Transport.
 *
 * @constructor @extends {Ephemeral}
 * @param {string} name  an arbitrary name used for debugging
 * @param {Transport} transport
 */
export var Channel = function(name, transport) {
  Ephemeral.call(this);

  /** @const @type {string}  */
  this.name = name;

  /** @const @type {Transport}  */
  this.transport_ = transport;

  /** @type {number} */
  this.requestId_ = 0;

  /** @const @type {!Object<string, {completer: Completer, message: Message}>}*/
  this.pendingMessages_ = {};

  /** @const @type {AxiomEvent} */
  this.onRequest = new AxiomEvent();

  this.transport_.onMessage.addListener(this.onMessage_, this);
};

export default Channel;

Channel.prototype = Object.create(Ephemeral.prototype);

/**
 * Send a request to the peer, returning a promise that completes when the
 * response is available.
 * @param {Object} request
 * @return {Promise<Object>}
 */
Channel.prototype.sendRequest = function(request) {
  this.requestId_++;
  var id = this.requestId_.toString();

  var message = new Message('ChannelRequest');
  message.subject = id;
  message.payload = request;

  var completer = new Completer();
  this.pendingMessages_[id] = {
    message: message,
    completer: completer
  };
  console.log('sending request', message);
  this.transport_.sendMessage(message);
  return completer.promise;
};

/**
 * Send a request to the peer, returning a promise that completes when the
 * response is available.
 * @param {string} subject
 * @param {Object} response
 * @return {Promise<Object>}
 */
Channel.prototype.sendResponse = function(subject, response) {
  this.requestId_++;
  var id = this.requestId_.toString();

  var message = new Message('ChannelRequest');
  message.subject = id;
  message.regarding = subject;
  message.payload = response;

  console.log('sending response', message);
  this.transport_.sendMessage(message);
  return Promise.resolve();
};

/**
 * @param {Message} message
 * @return {void}
 */
Channel.prototype.onMessage_ = function(message) {
  console.log('got message', message);
  if (!message.regarding) {
    this.onRequest.fire(message.subject, message.payload);
    return;
  }

  var id = message.regarding;
  var request = this.pendingMessages_[id];
  if (!request) {
    console.log('Warning: Received message regarding an unknown subject');
    return;
  }
  delete this.pendingMessages_[id];

  request.completer.resolve(message.payload);
};
