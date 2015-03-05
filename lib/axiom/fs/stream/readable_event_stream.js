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
import EventStream from 'axiom/fs/stream/event_stream';


var abstract = function() { throw new AxiomError.AbstractCall() };

/**
 * @constructor @extends {EventStream}
 */
export var ReadableEventStream = function() {
  EventStream.call(this);
  /** 
   * @private
   * @type {Array<*>}
   */
  this.events_ = [];
};

export default ReadableEventStream;

ReadableEventStream.prototype = Object.create(EventStream.prototype);

/**
 * Push data into the stream
 *
 * @param {*} data
 * @return {void}
 */
ReadableEventStream.prototype.push = function(data) {
  this.events_.push(data);
};
