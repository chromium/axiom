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
import PostMessageStreams from 'axiom/fs/stream/post_message_streams';
import EventWithCallback from 'axiom/fs/stream/generic_streams';
import Completer from 'axiom/core/completer';

/**
 * Extend PostMessageStreams for use with a Chrome extension.
 *
 * @constructor
 * @extends {PostMessageStreams}
 */
export var ExtensionStreams = function() {
  PostMessageStreams.call(this);

  /** @type {?string} */
  this.appId = null;

  /** @type {?Completer} */
  this.listenCompleter_ = null;

  // Handlers
  this.handleExtensionConnected_ = this.handleExtensionConnected_.bind(this);
};

ExtensionStreams.prototype = Object.create(PostMessageStreams.prototype);

export default ExtensionStreams;

/**
 * Open an ExtensionStream at given appId
 *
 * @param {string} appId The appId where receiving ExtensionStream lives.
 * @return {Promise}
 */
ExtensionStreams.prototype.openExtension = function(appId) {
  this.appId = appId;

  var port = chrome.runtime.connect(appId);
  return PostMessageStreams.prototype.open.call(this, {port: port,
      alreadyConnected: false});
};

/**
 * Listen (as an extension) for a connection.
 *
 * @return {Promise}
 */
ExtensionStreams.prototype.listenAsExtension = function() {
  if (!this.listenCompleter_) {
    this.listenCompleter_ = new Completer();
    chrome.runtime.onConnectExternal.addListener(this.handleExtensionConnected_);
  }
  return this.listenCompleter_.promise;
};

ExtensionStreams.prototype.handleExtensionConnected_ = function(port) {
  PostMessageStreams.prototype.open.call(this, {port: port,
      alreadyConnected: true});
  port.postMessage({command: 'connected'});
  this.listenCompleter_.resolve();
};
