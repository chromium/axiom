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
import AxiomEvent from 'axiom/core/event';
import Queue from 'axiom/fs/stream/queue';
import ReadableStreamSource from 'axiom/fs/stream/readable_stream_source';
import WritableStreamSource from 'axiom/fs/stream/writable_stream_source';
import PostMessageStreams from 'axiom/fs/stream/post_message_streams';

/** @typedef function():void */
var EventCallback;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
var StreamsSource;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * Expose a ReadableStream and a WritableStream over a Chrome extension.
 *
 * @constructor
 * @implements {StreamsSource}
 * @param {string} appId
 */
export var ExtensionStreams = function() {
  /** @type {?string} */
  this.appId = null;
  /** @type {?string} */
  this.portId = null;
  /** @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onReadable = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableStreamSource(this);
  /** @const @type {!WritableStream} */
  this.writableStream = new WritableStreamSource(this);

  /** @private @type {boolean} */
  this.paused_ = true;
  /** @const @private @type {Queue} */
  this.readQueue_ = new Queue();

  this.postStreams_ = null;

  this.onExtensionMessage_ = this.onExtensionMessage_.bind(this);
};

export default ExtensionStreams;

/**
 * @param {string} appId
 * @return {Promise}
 */
ExtensionStreams.prototype.open = function(appId) {
  /*%*/ console.log("open!" + appId); /*%*/
  this.appId = appId;

  this.port_ = chrome.runtime.connect(appId);

  this.port_.onMessage.addListener(this.onExtensionMessage_);
  this.postStreams_ = new PostMessageStreams();
  this.postStreams_.open(this.port_);
  //TODO: Verify extension exists (send message?)

  return Promise.resolve();
};

/**
 * @return {void}
 */
ExtensionStreams.prototype.close = function() {
  /*%*/ console.log("close!"); /*%*/
  //TODO: Implement
};

/**
 * @return {void}
 */
ExtensionStreams.prototype.pause = function() {
  /*%*/ console.log("pause!"); /*%*/
  this.paused_ = true;
};

/**
 * @return {void}
 */
ExtensionStreams.prototype.resume = function() {
  /*%*/ console.log("resume!"); /*%*/
  this.paused_ = false;
};

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
ExtensionStreams.prototype.read = function() {
  /*%*/ console.log("read!"); /*%*/
  return this.read_();
};

/**
 * Write data into the stream (for implementers of the stream only).
 * Invoke the "onData" callback for all pending events if the callback is set.
 *
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
ExtensionStreams.prototype.write = function(value, opt_callback) {
  /*%*/ console.log("write!" + value); /*%*/
  if (!this.appId)
      throw new AxiomError.Runtime('Cannot write: extension is not open.');
  this.postStreams_.write(value, opt_callback)
};

/**
 * @return {void}
 */
ExtensionStreams.prototype.onStreamError_ = function(error) {
  //TODO Wrap error in AxiomError
};

/**
 * @return {void}
 */
ExtensionStreams.prototype.onExtensionMessage_ = function(event) {
  /*%*/ console.log("onExtensionMessage_!" + event); /*%*/
  if (this.paused_) {
    this.onReadable.fire();
  } else {
    this.flushReadQueue_();
  }
};

/**
 * @return {void}
 */
ExtensionStreams.prototype.flushReadQueue_ = function() {
  while (!this.paused_) {
    var item = this.read_();
    if (!item)
      break;

    this.onData.fire(item);
  }
};

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
ExtensionStreams.prototype.read_ = function() {
  return this.readQueue_.dequeue();
};
