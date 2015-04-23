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
import AxiomStream from 'axiom/fs/stream/axiom_stream';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/**
 * @constructor @extends {AxiomStream} @implements {ReadableStream}
 * @param {!ReadableStream} stream
 */
export var ReadableStreamForwarder = function(stream) {
  AxiomStream.call(this);
  /** type {!AxiomEvent} */
  this.onData = new AxiomEvent();
  /** type {!AxiomEvent} */
  this.onReadable = new AxiomEvent();
  /** type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
  /** @type {!ReadableStream} */
  this.stream = stream;
  this.stream.onData.addListener(this.onDataCallback_, this);
  this.stream.onReadable.addListener(this.onReadableCallback_, this);
  this.stream.onClose.addListener(this.onCloseCallback_, this);
};

export default ReadableStreamForwarder;

ReadableStreamForwarder.prototype = Object.create(AxiomStream.prototype);

/**
 * @return {void}
 */
ReadableStreamForwarder.prototype.close = function() {
  this.stream.onData.removeListener(this.onDataCallback_, this);
  this.stream.onReadable.removeListener(this.onReadableCallback_, this);
  this.stream.onClose.removeListener(this.onCloseCallback_, this);
};

/**
 * @private
 * @param {*} value
 * @return {void}
 */
ReadableStreamForwarder.prototype.onDataCallback_ = function(value) {
  this.onData.fire(value);
};

/**
 * @private
 * @return {void}
 */
ReadableStreamForwarder.prototype.onReadableCallback_ = function() {
  this.onReadable.fire();
};

/**
 * @private
 * @return {void}
 */
ReadableStreamForwarder.prototype.onCloseCallback_ = function() {
  this.onClose.fire();
};

/**
 * @override
 * @return {void}
 */
ReadableStreamForwarder.prototype.pause = function() {
  return this.stream.pause();
};

/**
 * @override
 * @return {void}
 */
ReadableStreamForwarder.prototype.resume = function() {
  return this.stream.resume();
};

/**
 * @override
 * @return {*}
 */
ReadableStreamForwarder.prototype.read = function() {
  return this.stream.read();
};
