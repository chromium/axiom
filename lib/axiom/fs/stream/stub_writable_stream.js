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

import Ephemeral from 'axiom/core/ephemeral';
import AxiomError from 'axiom/core/error';

/** @typedef function():void */
var WriteCallback;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * @constructor
 * @extends {Ephemeral}
 * @implements {WritableStream}
 */
var StubWritableStream = function(fileSystem, stream, name, id) {
  Ephemeral.call(this);
  this.fileSystem = fileSystem;
  this.stream = stream;
  this.name = name;
  this.id = id;
};

export default StubWritableStream;

StubWritableStream.prototype = Object.create(Ephemeral.prototype);

/**
 * Write a value to the stream.
 *
 * @param {!*} value
 * @param {WriteCallback=} opt_callback  Callback invoked when the value has
 *     been consumed by the underlying transport.
 * @return {void}
 */
StubWritableStream.prototype.write = function(value, opt_callback) {
  throw new AxiomError.NotImplemented('Not yet implemented');
};
