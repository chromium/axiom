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
import AxiomStream from 'axiom/fs/stream/axiom_stream';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/**
 * @constructor @extends {AxiomStream} @implements {ReadableStream}
 * @param {!ReadableStream} stream
 */
export var ReadableStreamForwarder = function(stream) {
  AxiomStream.call(this);
 
  /** @const @type {!ReadableStream} */
  this.stream = stream;

  /** @type {!boolean} */
  this.closed_ = false;

  /** @const @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onReadable = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onEnd = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
  
  this.stream.onData.addListener(this.onDataCallback_, this);
  this.stream.onReadable.addListener(this.onReadableCallback_, this);
  this.stream.onEnd.listenOnce(this.end, this);
  this.stream.onClose.listenOnce(this.close, this);
};

export default ReadableStreamForwarder;

ReadableStreamForwarder.prototype = Object.create(AxiomStream.prototype);

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
 * @param type {*} value
 * @return {void}
 */
ReadableStreamForwarder.prototype.onReadableCallback_ = function() {
  this.onReadable.fire();
};

/**
 * @override
 * @return {void}
 */
ReadableStreamForwarder.prototype.pause = function() {
  this.assertOpen();  
  return this.stream.pause();
};

/**
 * @override
 * @return {void}
 */
ReadableStreamForwarder.prototype.resume = function() {
  this.assertOpen();  
  return this.stream.resume();
};

/**
 * @override
 * @return {*}
 */
ReadableStreamForwarder.prototype.read = function() {
  this.assertOpen();  
  return this.stream.read();
};

/**
 * @return {void}
 */
ReadableStreamForwarder.prototype.end = function() {
  this.assertOpen();  
  this.onEnd.fire();
  this.stream.onData.removeListener(this.onDataCallback_, this);
  this.stream.onReadable.removeListener(this.onReadableCallback_, this);
};

/**
 * @override
 * @return {void}
 */
ReadableStreamForwarder.prototype.close = function() {
  this.stream.onData.removeListener(this.onDataCallback_, this);
  this.stream.onReadable.removeListener(this.onReadableCallback_, this);
  AxiomStream.prototype.close.call(this);
};
