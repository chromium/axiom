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
export var WriteCallback;

/**
 * Interface similar to node.js writable stream.
 *
 * @interface
 */
export var WritableStream = function() {};

/**
  * Fires when end() has been called and all data has been flushed.
  *
  * @type {!AxiomEvent}
  */
WritableStream.prototype.onFinish;

/**
 * Write a value to the stream.
 *
 * @param {!*} value
 * @param {WriteCallback=} opt_callback  Callback invoked when the value has
 *     been consumed by the underlying transport.
 * @return {void}
 */
WritableStream.prototype.write = function(value, opt_callback) {};

/**
 * Close the stream when there is no more data to write.
 *
 * @return {void}
 */
WritableStream.prototype.end = function() {};
