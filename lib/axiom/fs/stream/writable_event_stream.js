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
import Queue from 'axiom/fs/stream/queue';

/** @typedef function():void */
var EventCallback;

/**
 * Event value + associated callback
 * @constructor
 * @param {!*} value
 * @param {!EventCallback} callback
 */
var EventWithCallback = function(value, callback) {
  this.value = value;
  this.callback = callback;
};

/**
 * @constructor @extends {EventStream}
 */
export var WritableEventStream = function() {
  EventStream.call(this);
  /** @const @private @type {Queue} */
  this.events_ = new Queue();
  /** @const @type {!AxiomEvent} */
  this.onData = new AxiomEvent();
};

export default WritableEventStream;

WritableEventStream.prototype = Object.create(EventStream.prototype);

/**
 * Write an event to the stream.
 *
 * @param {!*} value
 * @param {EventCallback=} opt_callback
 * @return {void}
 */
WritableEventStream.prototype.write = function(value, opt_callback) {
  var item = value;
  if (opt_callback) {
    item = new EventWithCallback(value, opt_callback);
  }
  this.events_.enqueue(item);
  this.onData.fire(value, opt_callback);
};
