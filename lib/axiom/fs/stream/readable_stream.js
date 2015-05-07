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

/**
 * Interface similar to node.js readable stream.
 *
 * Readable streams have two "modes": a flowing mode and a paused mode. When in
 * flowing mode, data is read from the underlying system and provided to your
 * program as fast as possible. In paused mode, you must explicitly call
 * stream.read() to get chunks of data out. Streams start out in paused mode.
 *
 * @interface
 */
export var ReadableStream = function() {};

/**
  * When the stream is in flowing mode, onData events are fired with values
  * as soon as data is available.
  *
  * @type {!AxiomEvent}
  */
ReadableStream.prototype.onData;

/**
  * When the stream is in paused mode, onReablable events are fired when
  * data is available to read.
  *
  * @type {!AxiomEvent}
  */
ReadableStream.prototype.onReadable;

/**
  * Fires when there is no more data to read.
  *
  * @type {!AxiomEvent}
  */
ReadableStream.prototype.onEnd;

/**
  * Emitted when the underlying resource (for example, the backing file
  * descriptor) has been closed. Not all streams will emit this.
  *
  * @type {!AxiomEvent}
  */
ReadableStream.prototype.onClose;

/**
 * Switch the stream to paused mode, no more onData events are fired.
 *
 * @return {void}
 */
ReadableStream.prototype.pause = function() {};

/**
 * Switch the stream to flowing mode, onData events are fired when data is
 * available.
 *
 * @return {void}
 */
ReadableStream.prototype.resume = function() {};

/**
 * When the stream is in paused mode, read one value from the stream, or return
 * undefined when the stream is empty.
 *
 * @return {*}
 */
ReadableStream.prototype.read = function() {};
