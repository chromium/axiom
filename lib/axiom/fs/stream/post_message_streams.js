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
export var PostMessageStreams = function() {
  /** @type {chrome.runtime.Port} */
  this.port = null;
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
  /** @private @type {?Function} */
  this.onOpenComplete_ = null

  // Bind event handlers
  this.onConnectedMessage_ = this.onConnectedMessage_.bind(this);
  this.onPostMessage_ = this.onPostMessage_.bind(this);

};

export default PostMessageStreams;

/**
 * @param {chrome.runtime.Port} port
 * @return {Promise}
 */
PostMessageStreams.prototype.open = function(port) {
  /*%*/ console.log("open!" + port); /*%*/
  this.port = port;

  port.onMessage.addListener(this.onConnectedMessage_, false);
  //TODO: Verify extension exists (send message?)

  return new Promise(function (resolve, reject) {
    this.onOpenComplete_ = resolve;
  }.bind(this));
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
 * @return {void}
 */
PostMessageStreams.prototype.pause = function() {
  /*%*/ console.log("pause!"); /*%*/
  this.paused_ = true;
};

/**
 * @return {void}
 */
PostMessageStreams.prototype.resume = function() {
  /*%*/ console.log("resume!"); /*%*/
  this.paused_ = false;
};

/**
 * Consume one event from the stream. Return undefined if the
 * stream is empty.
 *
 * @return {*}
 */
PostMessageStreams.prototype.read = function() {
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
PostMessageStreams.prototype.write = function(value, opt_callback) {
  /*%*/ console.log("write!" + value); /*%*/
  if (!this.port)
      throw new AxiomError.Runtime(
          'Cannot write: no port is associated with stream.  Use open().');

  /** @type {!chrome.runtime.Port} */
  var port = this.port;

  port.postMessage(/* TODO fix */ value, undefined)
};

/**
 * @return {void}
 */
PostMessageStreams.prototype.onStreamError_ = function(error) {
  //TODO Wrap error in AxiomError
};

/**
 * @return {void}
 */
PostMessageStreams.prototype.onConnectedMessage_ = function(event) {
  console.log(event);
  this.onOpenComplete_();
  this.port.onMessage.removeListener(this.onConnectedMessage_, false);
  this.port.onMessage.addListener(this.onPostMessage_, false);
}
/**
 * @return {void}
 */
PostMessageStreams.prototype.onPostMessage_ = function(event) {
  /*%*/ console.log("onPostMessage_!" + event); /*%*/
  if (this.paused_) {
    this.onReadable.fire();
  } else {
    this.flushReadQueue_();
  }
};

/**
 * @return {void}
 */
PostMessageStreams.prototype.flushReadQueue_ = function() {
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
PostMessageStreams.prototype.read_ = function() {
  /*%*/ console.log("read_!"); /*%*/
  return this.readQueue_.dequeue();
};
