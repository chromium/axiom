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
  this.onOpenResolve_ = null;
  /** @private @type {GenericStreams.ConnectionState} */
  this.connectionState_ = GenericStreams.ConnectionState.CLOSED;

  // Bind event handlers
  this.onConnectedMessage_ = this.onConnectedMessage_.bind(this);
  this.onPostMessage_ = this.onPostMessage_.bind(this);
  this.onDisconnect_ = this.onDisconnect_.bind(this);
};

PostMessageStreams.prototype = Object.create(GenericStreams.prototype);

export default PostMessageStreams;

/**
 * @return {Promise}
 * @param {*} argObject
 */
PostMessageStreams.prototype.open = function(argObject) {
  /** @type {chrome.runtime.Port} port */
  var port = argObject.port
  /** @param {boolean=} alreadyConnected */
  var alreadyConnected = argObject.alreadyConnected;
  
  /*%*/ console.log("open!" + port); /*%*/
  this.port = port;

  if (alreadyConnected) {
    this.handleConnected_();
    // TODO(ericarnold): Handle failed connect event
    // TODO(ericarnold): Handle disconnect event
    // TODO(ericarnold): Handle error event
    return Promise.resolve();
  } else {
    this.connectionState_ = GenericStreams.ConnectionState.CONNECTING;
    port.onMessage.addListener(this.onConnectedMessage_, false);
    port.onDisconnect.addListener(this.onConnectionError_, false);

    return new Promise(function (resolve, reject) {
      this.onOpenResolve_ = resolve;
      this.onOpenReject_ = reject;
    }.bind(this));
  }

};

/**
 * @return {void}
 */
PostMessageStreams.prototype.close = function() {
  /*%*/ console.log("close!"); /*%*/
  this.port.disconnect();
  this.connectionState_ = GenericStreams.ConnectionState.CLOSING;
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
  this.cleanupConnectionListeners_();
  this.handleConnected_();
  this.onOpenResolve_();
}

/**
 * @return {void}
 */
PostMessageStreams.prototype.onConnectionError_ = function(event) {
  /*%*/ console.log("onConnectionError_!"); /*%*/
  this.port = null;
  this.connectionState_ = GenericStreams.ConnectionState.CLOSED;
  this.cleanupConnectionListeners_();
  this.onOpenReject_();
}

/**
 * @return {void}
 */
PostMessageStreams.prototype.onDisconnect_ = function(event) {
  /*%*/ console.log("onDisconnect_!"); /*%*/
  this.connectionState_ = GenericStreams.ConnectionState.CLOSED;
  this.handleClose_();
  this.port = null;
}

/**
 *
 */
PostMessageStreams.prototype.handleConnected_ = function() {
  this.connectionState_ = GenericStreams.ConnectionState.CONNECTED;
  this.port.onMessage.addListener(this.onPostMessage_, false);
  this.port.onDisconnect.addListener(this.onDisconnect_, false);
  GenericStreams.prototype.handleConnected_.call(this);
}

/**
 * @protected
 * @return {void}
 */
PostMessageStreams.prototype.handleClose_ = function() {
  /*%*/ console.log("handleClose_!"); /*%*/
  this.port.onMessage.removeListener(this.onPostMessage_, false);
  this.port.onDisconnect.removeListener(this.onDisconnect_, false);
  GenericStreams.prototype.handleClose_.call(this);
}

/**
 * @return {void}
 */
PostMessageStreams.prototype.cleanupConnectionListeners_ = function() {
  this.port.onMessage.removeListener(this.onConnectedMessage_, false);
  this.port.onDisconnect.removeListener(this.onConnectionError_, false);
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

