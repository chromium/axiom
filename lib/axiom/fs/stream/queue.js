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

/**
 * Simple abstraction over a FIFO queue.
 * Current implementation is O(n) when dequeuing. It could be replaced
 * with a double stack, a sliding window array, a double linked list, etc.
 *
 * @constructor
 */
export var Queue = function() {
  /** @const @private @type {Array<*>} */
  this.items_ = [];
};

export default Queue;

/**
 * @param {*} value
 * @return {void}
 */
Queue.prototype.enqueue = function(value) {
  this.items_.push(value);
}

/**
 * @return {*}
 */
Queue.prototype.dequeue = function() {
  if (this.empty()) {
    throw new AxiomError.Runtime('Dequeuing from an empty queue');
  }
  return this.items_.shift();
}

/**
 * @return {boolean}
 */
Queue.prototype.empty = function() {
  return this.items_.length == 0;
}
