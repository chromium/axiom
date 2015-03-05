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
import EventStream from 'axiom/fs/stream/event_stream';


var abstract = function() { throw new AxiomError.AbstractCall() };

/**
 * Simple abstraction over a FIFO queue.
 * Current implementation is O(n) when dequeuing. It could be replaced
 * with a double stack, a sliding window array, a double linked list, etc.
 *
 * @constructor
 */
var Queue = function() {
  /** @private @type {Array<*>} */
  this.items_ = [];
};

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

/**
 * Simple abstraction over a FIFO queue.
 * Current implementation is O(n) when dequeuing. It could be replaced
 * with a double stack, a sliding window array, a double linked list, etc.
 *
 * @constructor
 * @param {!*} value
 * @param {!function():void} callback
 */
var EventWithCallback = function(value, callback) {
  this.value = value;
  this.callback = callback;
};

/**
 * @constructor @extends {EventStream}
 */
export var ReadableEventStream = function() {
  EventStream.call(this);
  /** 
   * @private
   * @type {Queue}
   */
  this.events_ = new Queue();
  /** @const @type {!AxiomEvent} */
  this.onConsumed = new AxiomEvent();
  /** @const @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
};

export default ReadableEventStream;

ReadableEventStream.prototype = Object.create(EventStream.prototype);

/**
 * Push data into the stream
 *
 * @param {!*} value
 * @param {function(): void=} opt_callback
 * @return {void}
 */
ReadableEventStream.prototype.push = function(value, opt_callback) {
  var item = value;
  if (opt_callback) {
    item = new EventWithCallback(value, opt_callback);
  }
  this.events_.enqueue(item);
  this.onData.fire();
};

/**
 * Push data into the stream
 *
 * @return {*}
 */
ReadableEventStream.prototype.consume = function() {
  var item = this.events_.dequeue();
  if (item instanceof EventWithCallback) {
    item.callback();
    item = item.value;
  }
  this.onConsumed.fire();
  return item;
};
