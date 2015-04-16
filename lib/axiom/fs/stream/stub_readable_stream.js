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

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef StubFileSystem$$module$axiom$fs$stream$stub_file_system */
var StubFileSystem;

/**
 * @constructor
 * @extends {Ephemeral}
 * @implements {ReadableStream}
 *
 * @param {!StubFileSystem} fileSystem
 * @param {!ReadableStream} stream
 * @param {!string} name
 * @param {!string} id
 */
var StubReadableStream = function(fileSystem, stream, name, id) {
  Ephemeral.call(this);
  this.fileSystem = fileSystem;
  this.stream = stream;
  this.name = name;
  this.id = id;

  this.onClose.addListener(function(reason, value) {
    this.fileSystem.sendRequest_({
        cmd: 'readable-stream.close',
        streamId: this.id,
        closeReason: reason,
        closeValue: value}).then(
      function(response) {
        // TODO(rpaquay): What do we do here?
      }
    );
  }.bind(this));
};

export default StubReadableStream;

StubReadableStream.prototype = Object.create(Ephemeral.prototype);

/**
 * Switch the stream to paused mode, no more onData events are fired.
 *
 * @return {void}
 */
StubReadableStream.prototype.pause = function() {
  throw new AxiomError.NotImplemented('Not yet implemented');
};

/**
 * Switch the stream to flowing mode, onData events are fired when data is
 * available.
 *
 * @return {void}
 */
StubReadableStream.prototype.resume = function() {
  throw new AxiomError.NotImplemented('Not yet implemented');
};

/**
 * When the stream is in paused mode, read one value from the stream, or return
 * undefined when the stream is empty.
 *
 * @return {*}
 */
StubReadableStream.prototype.read = function() {
  throw new AxiomError.NotImplemented('Not yet implemented');
};