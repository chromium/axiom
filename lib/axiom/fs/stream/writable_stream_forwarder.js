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
import Completer from 'axiom/core/completer';
import AxiomStream from 'axiom/fs/stream/axiom_stream';

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/** @typedef WriteCallback$$module$axiom$fs$stream$writable_stream */
var WriteCallback;

/**
 * @constructor @extends {AxiomStream} @implements {WritableStream}
 * @param {!WritableStream} stream
 * @param {string=} opt_name
 */
export var WritableStreamForwarder = function(stream, opt_name) {
  AxiomStream.call(this, 'WritableStreamForwarder ' +
      (opt_name || '<unnamed>') + ' ->' + stream['name']);

  /** @type {!WritableStream} */
  this.stream = stream;

  /** @type {!AxiomEvent} */
  this.onFinish = new AxiomEvent();
};

export default WritableStreamForwarder;

WritableStreamForwarder.prototype = Object.create(AxiomStream.prototype);

/**
 * Write a value to the stream.
 *
 * @override
 * @param {!*} value
 * @param {WriteCallback=} opt_callback  Callback invoked when the value has
 *     been consumed by the underlying transport.
 * @return {void}
 */
WritableStreamForwarder.prototype.write = function(value, opt_callback) {
  this.assertOpen();
  this.stream.write(value, opt_callback);
};

/**
 * Close the stream when there is no more data to write.
 *
 * @override
 * @return {void}
 */
WritableStreamForwarder.prototype.end = function() {
  this.assertOpen();
  this.stream.end();
  this.onFinish.fire();
};
