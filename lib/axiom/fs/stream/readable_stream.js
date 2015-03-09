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
import BaseStream from 'axiom/fs/stream/base_stream';
import WritableStream from 'axiom/fs/stream/writable_stream';

var abstract = function() { throw new AxiomError.AbstractCall() };

/** @typedef function(*):void */
var DataCallback;

/**
 * @constructor @extends {BaseStream}
 */
export var ReadableStream = function() {
  BaseStream.call(this);
  /** @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
};

export default ReadableStream;

ReadableStream.prototype = Object.create(BaseStream.prototype);

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

  /**
 * This method pulls all the data out of a readable stream, and writes it to
 * the supplied destination, automatically managing the flow so that the
 * destination is not overwhelmed by a fast readable stream.
 *
 * @param {!WritableStream} destination
 * @return {!WritableStream}
 */
ReadableStream.prototype.pipe = function(destination) {
  abstract();
  return destination;
};
