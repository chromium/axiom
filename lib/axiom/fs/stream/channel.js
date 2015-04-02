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

  this.name = name;

  /** @const @type {Transport}  */
  this.transport_ = transport;

  /** @type {number} */
  this.requestId_ = 0;

  /** @const @type {!Object<string, {completer: Completer, message: Message}>}*/
  this.pendingMessages_ = {};

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
  this.transport_.sendMessage(message);
  return completer.promise;
};

/**
 * @param {Message} message
 * @return {void}
 */
Channel.prototype.onMessage_ = function(message) {
  if (!message.subject)
    return;

  var id = message.subject;
  var request = this.pendingMessages_[id];
  if (!request)
    return;
  delete this.pendingMessages_[id];

  request.completer.resolve(message.payload);
};
