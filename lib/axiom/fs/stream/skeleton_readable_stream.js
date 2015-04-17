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
import AxiomEvent from 'axiom/core/event';
import AxiomStream from 'axiom/fs/stream/axiom_stream';
import MemoryStreamBuffer from 'axiom/fs/stream/memory_stream_buffer';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef SkeletonFileSystem$$module$axiom$fs$stream$skeleton_file_system */
var SkeletonFileSystem;

/**
 * @constructor
 * @extends {Ephemeral}
 *
 * @param {!SkeletonFileSystem} fileSystem
 * @param {!string} id
 */
var SkeletonReadableStream = function(fileSystem, id) {
  Ephemeral.call(this);
  /** @const @type {!SkeletonFileSystem} */
  this.fileSystem = fileSystem;

  /** @const @type {!string} */
  this.id = id;

  /** @const @type {!ReadableStreamImplementation} */
  this.streamImpl = new ReadableStreamImplementation(this);

  /** @const @type {!ReadableStream} */
  this.stream = this.streamImpl;

  this.onClose.addListener(this.onCloseHandler, this);
};

export default SkeletonReadableStream;

SkeletonReadableStream.prototype = Object.create(Ephemeral.prototype);

/**
 * @param {*} value
 * @return {void}
 */
SkeletonReadableStream.prototype.onDataHandler = function(value) {
  this.streamImpl.buffer.write(value);
};

/**
 * @return {void}
 */
SkeletonReadableStream.prototype.onReadableHandler = function() {
  var readNext = function() {
    this.stream.fileSystem.sendRequest({
      cmd: 'readable-stream.read',
      streamId: this.stream.id
    }).then(
      function(value) {
        if (value) {
          this.streamImpl.buffer.write(value);
          readNext();
        }
      }.bind(this)
    );
  };

  return readNext();
};

/**
 * @param {*} value
 * @return {void}
 */
SkeletonReadableStream.prototype.onCloseHandler = function() {
  // TODO(rpaquay): Maybe "onEnd" down the line?
  this.streamImpl.buffer.close();
};

/**
 * @constructor
 * @extends {AxiomStream}
 * @implements {ReadableStream}
 *
 * @param {!SkeletonReadableStream} stream
 */
var ReadableStreamImplementation = function(stream) {
  AxiomStream.call(this);
  /** @const @type {!SkeletonReadableStream} */
  this.stream = stream;
  this.buffer = new MemoryStreamBuffer();
  /** @const @type {!AxiomEvent} */
  this.onData = this.buffer.onData;
  /** @const @type {!AxiomEvent} */
  this.onReadable = this.buffer.onReadable;
  /** @type {!AxiomEvent} */
  this.onClose = this.buffer.onClose;
};

ReadableStreamImplementation.prototype = Object.create(AxiomStream.prototype);

/**
 * @override
 * @return {void}
 */
ReadableStreamImplementation.prototype.pause = function() {
  this.buffer.pause();

  // TODO(rpaquay): Add error handling
  this.stream.fileSystem.sendRequest({
    cmd: 'readable-stream.pause',
    streamId: this.stream.id
  });
};

/**
 * @override
 * @return {void}
 */
ReadableStreamImplementation.prototype.resume = function() {
  this.buffer.resume();

  // TODO(rpaquay): Add error handling
  this.stream.fileSystem.sendRequest({
    cmd: 'readable-stream.resume',
    streamId: this.stream.id
  });
};

/**
 * @override
 * @return {*}
 */
ReadableStreamImplementation.prototype.read = function() {
  return this.buffer.read();
};
