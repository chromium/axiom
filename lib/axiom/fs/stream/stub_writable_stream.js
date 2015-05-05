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

/** @typedef StubFileSystem$$module$axiom$fs$stream$stub_file_system */
var StubFileSystem;

/** @typedef function():void */
var WriteCallback;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * Forward all events and function calls from a local WritableStream
 * implementation to its corresponding remote stream (given its remote id).
 *
 * @constructor
 * @extends {Ephemeral}
 *
 * @param {!StubFileSystem} fileSystem
 * @param {!WritableStream} stream
 * @param {!string} name
 * @param {!string} id
 */
var StubWritableStream = function(fileSystem, stream, name, id) {
  Ephemeral.call(this);

  /** @const @type {!StubFileSystem} */
  this.fileSystem = fileSystem;
  /** @const @type {!WritableStream} */
  this.stream = stream;
  /** @const @type {!string} */
  this.name = name;
  /** @const @type {!string} */
  this.id = id;

  this.onClose.addListener(function(reason, value) {
    this.fileSystem.sendRequest_({
        cmd: 'writable-stream.close',
        streamId: this.id,
        closeReason: reason,
        closeValue: value}).then(
      function(response) {
        // TODO(rpaquay): What do we do here?
      }
    );
  }.bind(this));
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
  this.stream.write(value, opt_callback);
};

/**
 * Close the stream when there is no more data to write.
 *
 * @return {void}
 */
StubWritableStream.prototype.end = function() {
  this.stream.end();
};
