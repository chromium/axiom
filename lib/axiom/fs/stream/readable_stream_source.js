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

/** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
var StreamsSource;

/**
 * Implementation of a readable stream over a StreamsSource.
 *
 * @constructor @extends {AxiomStream} @implements {ReadableStream}
 * @param {StreamsSource} source
 */
export var ReadableStreamSource = function(source) {
  AxiomStream.call(this);

  /** @const @private @type {StreamsSource} */
  this.source_ = source;

  /** @const @type {!AxiomEvent} */
  this.onData = source.onData;
  /** @const @type {!AxiomEvent} */
  this.onReadable = source.onReadable;
  /** @const @type {!AxiomEvent} */
  this.onEnd = new AxiomEvent();

  this.source_.onFlush.listenOnce(this.end, this);
  this.source_.onClose.listenOnce(this.close, this);
};

export default ReadableStreamSource;

ReadableStreamSource.prototype = Object.create(AxiomStream.prototype);

/**
 * @override
 * @return {void}
 */
ReadableStreamSource.prototype.pause = function() {
  this.assertOpen();
  this.source_.pause();
};

/**
 * @override
 * @return {void}
 */
ReadableStreamSource.prototype.resume = function() {
  this.assertOpen();
  this.source_.resume();
};

/**
 * @override
 * @return {*}
 */
ReadableStreamSource.prototype.read = function() {
  this.assertOpen();
  return this.source_.read();
};

/**
 * @return {void}
 */
ReadableStreamSource.prototype.end = function() {
  this.assertOpen();
  this.onEnd.fire();
};
