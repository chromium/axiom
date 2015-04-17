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
 * Extend a GenericStreams over a messaging port.
 *
 * @constructor
 * @extends {GenericStreams}
 */
export var PostMessageStreams = function() {
  GenericStreams.call(this);

  /** @type {chrome.runtime.Port} */
  this.port = null;
  /** @private @type {?Function} */
  this.onOpenComplete_ = null;
  /** @private @type {GenericStreams.ConnectionState} */
  this.connectionState_ = GenericStreams.ConnectionState.CLOSED;

  // Bind event handlers
  this.onConnectedMessage_ = this.onConnectedMessage_.bind(this);
  this.onPostMessage_ = this.onPostMessage_.bind(this);
};

PostMessageStreams.prototype = Object.create(GenericStreams.prototype);

export default PostMessageStreams;

/**
 * @return {Promise}
 * @param {chrome.runtime.Port} port
 * @param {boolean=} alreadyConnected
 */
PostMessageStreams.prototype.openPort = function(port, alreadyConnected) {
  /*%*/ console.log("open!" + port); /*%*/
  this.port = port;

  if (alreadyConnected) {
    this.connectionState_ = GenericStreams.ConnectionState.CONNECTED;
    port.onMessage.addListener(this.onPostMessage_, false);
    // TODO(ericarnold): Handle failed connect event
    // TODO(ericarnold): Handle disconnect event
    // TODO(ericarnold): Handle error event
    return Promise.resolve();
  } else {
    this.connectionState_ = GenericStreams.ConnectionState.CONNECTING;
    port.onMessage.addListener(this.onConnectedMessage_, false);

    return new Promise(function (resolve, reject) {
      this.onOpenComplete_ = resolve;
    }.bind(this));
  }
};

/**
 * @return {void}
 */
PostMessageStreams.prototype.close = function() {
  /*%*/ console.log("close!"); /*%*/
  this.port = null;
  //TODO: Implement
};

/**
 * @protected
 * @param {EventWithCallback|string} item
 * @return {void}
 */
PostMessageStreams.prototype.handleSend_ = function(item) {
  /*%*/ console.log("handleSend_!"); /*%*/
  GenericStreams.prototype.handleSend_.call(this, item);

  if (item instanceof EventWithCallback) {
    this.port.postMessage(/* string */(item.value), undefined);

    // TODO (ericarnold): implement callback
    item.callback();
  } else {
    this.port.postMessage(/** @type {string} */(item), undefined);
  }
};

/**
 * @return {void}
 */
PostMessageStreams.prototype.onConnectedMessage_ = function(event) {
  console.log(event);
  this.connectionState_ = GenericStreams.ConnectionState.CONNECTED;
  this.onOpenComplete_();
  this.port.onMessage.removeListener(this.onConnectedMessage_, false);
  this.port.onMessage.addListener(this.onPostMessage_, false);
}

/**
 * @return {void}
 */
PostMessageStreams.prototype.onPostMessage_ = function(message) {
  /*%*/ console.log("onPostMessage_!" + message); /*%*/
  this.handleReceive_(message);
};

/**
 * Return the state of the connection.
 *
 * @protected
 */
PostMessageStreams.prototype.getState_ = function() {
  if (this.port == null) {
    return GenericStreams.ConnectionState.CLOSED;
  } else {
    return this.connectionState_;
  }
}

