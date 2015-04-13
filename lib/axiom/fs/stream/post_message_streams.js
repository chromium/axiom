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
  /** @type {Window} */
  this.window = null;
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
};

export default PostMessageStreams;

/**
 * @param {Window|Port} window
 * @return {Promise}
 */
PostMessageStreams.prototype.open = function(window) {
  /*%*/ console.log("open!" + window); /*%*/
  this.window = window;

  window.onMessage.addListener(this.onPostMessage_, false);
  //TODO: Verify extension exists (send message?)

  return Promise.resolve();
};

/**
 * @return {void}
 */
PostMessageStreams.prototype.close = function() {
  /*%*/ console.log("close!"); /*%*/
  this.window = null;
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
  if (!this.connected)
      throw new AxiomError.Runtime(
          'Cannot write: no window is associated with stream.  Use open().');

  /** @type {!Window} */
  var window = this.window;

  window.postMessage(/* TODO fix */ value.toString(), /* TODO specify */ '*')
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
PostMessageStreams.prototype.onPostMessage_ = function(event) {
  console.log(request);
  var promise;
  promise = Promise.resolve("okay!");

  // if (request.type === 'call_api') {
  //   promise = callApi_(resolveApi_(request.api), request.args, request.options);
  // } else if (request.type === 'execute_script') {
  //   promise = executeScriptInTabs_(request.tabIds, request.code, request.options);
  // } else if (request.type === 'insert_css') {
  //   promise = insertCssIntoTabs_(request.tabIds, request.css, request.options);
  // } else {
  //   promise = Promise.reject('Unrecognized request type "' + request.type + '"');
  // }

  promise.then(function(result) {
    sendResponse({success: true, result: result});
  }).catch(function(error) {
    sendResponse({success: false, error: error.message ? error.message : error});
  });

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
  return this.readQueue_.dequeue();
};
