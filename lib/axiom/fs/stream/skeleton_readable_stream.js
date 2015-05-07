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
 * Expose and manage a ReadableStream implementation given a unique stream id
 * from a skeleton file system.

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

  /** @private @const @type {!ReadableStreamImplementation} */
  this.streamImpl_ = new ReadableStreamImplementation(this);

  /** @const @type {!ReadableStream} */
  this.stream = this.streamImpl_;

  this.onClose.addListener(this.onCloseHandler_, this);
};

export default SkeletonReadableStream;

SkeletonReadableStream.prototype = Object.create(Ephemeral.prototype);

/**
 * @param {*} value
 * @return {void}
 */
SkeletonReadableStream.prototype.onDataHandler = function(value) {
  this.streamImpl_.buffer.write(value);
};

/**
 * @return {void}
 */
SkeletonReadableStream.prototype.onReadableHandler = function() {
  var readNext = function() {
    this.fileSystem.sendRequest({
      cmd: 'readable-stream.read',
      streamId: this.id
    }).then(
      function(value) {
        if (value) {
          this.streamImpl_.buffer.write(value);
          readNext();
        }
      }.bind(this)
    );
  }.bind(this);

  return readNext();
};

/**
 * @param {*} reason
 * @return {void}
 */
SkeletonReadableStream.prototype.onCloseHandler_ = function(reason) {
  // TODO(rpaquay): Maybe "onEnd" down the line?
  this.streamImpl_.buffer.close(reason);
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
  /**
   * We use a memory stream to buffer data between the remote peer and the
   * consumer of this stream. This would not be required if the contract
   * ReadableStream.read was changed to return a Promise instead of returning
   * a value directly.
   *
   * @const @type {!MemoryStreamBuffer}
   */
  this.buffer = new MemoryStreamBuffer();
  /** @const @type {!AxiomEvent} */
  this.onData = this.buffer.onData;
  /** @const @type {!AxiomEvent} */
  this.onReadable = this.buffer.onReadable;
  /** @type {!AxiomEvent} */
  this.onClose = this.buffer.onClose;
  /** @type {!AxiomEvent} */
  this.onEnd = this.buffer.onEnd;
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
  var result = this.buffer.read();
  if (!result) {
    this.stream.onReadableHandler();
  }
  return result;
};
