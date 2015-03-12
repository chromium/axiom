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
import WritableStream from 'axiom/fs/stream/writable_stream';

var abstract = function() { throw new AxiomError.AbstractCall() };

/** @typedef function(*):void */
var DataCallback;

/**
 * @constructor @extends {AxiomStream}
 */
export var ReadableStream = function() {
  AxiomStream.call(this);
  /**
   * When stream is not paused, onData events are fired with data as soon as it
   * arrives from the underlying source.
   *
   * @type {!AxiomEvent}
   */
  this.onData = new AxiomEvent();

  /**
   * Whem stream is paused, onReadable events are fired each time data
   * is available to read from the stream.

   * @type {!AxiomEvent}
   */
  this.onReadable = new AxiomEvent();
};

export default ReadableStream;

ReadableStream.prototype = Object.create(AxiomStream.prototype);

/**
 * @return {void}
 */
ReadableStream.prototype.pause = function() {
  abstract();
}

/**
 * @return {void}
 */
ReadableStream.prototype.resume = function() {
  abstract();
}

/**
 * @return {*}
 */
ReadableStream.prototype.read = function() {
  abstract();
}
