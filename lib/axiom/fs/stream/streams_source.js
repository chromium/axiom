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

/** @typedef function():void */
var EventCallback;

/**
 * Abstraction over the source of a pair of Readable and Writable streams.
 *
 * @interface
 */
export var StreamsSource = function() {};

/**
  * When the stream is in flowing mode, onData events are fired with values
  * as soon as data is available.
  *
  * @type {!AxiomEvent}
  */
StreamsSource.prototype.onData;

/**
  * When the stream is in paused mode, onReablable events are fired when
  * data is available to read.
  *
  * @type {!AxiomEvent}
  */
StreamsSource.prototype.onReadable;

/**
  * Emitted when the pending events get flushed from the internal buffer to
  * the readable stream, so the latter can take appropriate action.
  *
  * @type {!AxiomEvent}
  */
StreamsSource.prototype.onFlush;

/**
  * Emitted when the underlying resource (for example, the backing file
  * descriptor) has been closed. Not all streams will emit this.
  *
  * @type {!AxiomEvent}
  */
StreamsSource.prototype.onClose;

/**
 * Switch the stream to paused mode, no more onData events are fired.
 *
 * @return {void}
 */
StreamsSource.prototype.pause = function() {};

/**
 * Switch the stream to flowing mode, onData events are fired when data is
 * available.
 *
 * @return {void}
 */
StreamsSource.prototype.resume = function() {};

/**
 * When the stream is in paused mode, read one value from the stream, or return
 * undefined when the stream is empty.
 *
 * @return {*}
 */
StreamsSource.prototype.read = function() {};

/**
 * Write an event to the stream.
 *
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
StreamsSource.prototype.write = function(value, opt_callback) {};

/**
 * Flush .
 *
 * @return {void}
 */
StreamsSource.prototype.flush = function() {};
