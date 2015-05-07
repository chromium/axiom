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

/** @typedef SkeletonFileSystem$$module$axiom$fs$stream$skeleton_file_system */
var SkeletonFileSystem;

/** @typedef function():void */
var WriteCallback;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * @constructor
 * @extends {Ephemeral}
 *
 * @param {!SkeletonFileSystem} fileSystem
 * @param {!string} id
 */
var SkeletonWritableStream = function(fileSystem, id) {
  Ephemeral.call(this);

  /** @const @type {!SkeletonFileSystem} */
  this.fileSystem = fileSystem;

  /** @const @type {!string} */
  this.id = id;

  /** @const @type {!WritableStream} */
  this.stream = new WritableStreamImplementation(this);
};

export default SkeletonWritableStream;

SkeletonWritableStream.prototype = Object.create(Ephemeral.prototype);

/**
 * @constructor
 * @extends {AxiomStream}
 * @implements {WritableStream}
 *
 * @param {!SkeletonWritableStream} stream
 */
var WritableStreamImplementation = function(stream) {
  AxiomStream.call(this);

  /** @type {!AxiomEvent} */
  this.onFinish = new AxiomEvent();

  /** @const @type {!SkeletonWritableStream} */
  this.stream = stream;
};

WritableStreamImplementation.prototype = Object.create(AxiomStream.prototype);

/**
 * Write an event to the stream.
 *
 * @override
 * @param {!*} value
 * @param {WriteCallback=} opt_callback
 * @return {void}
 */
WritableStreamImplementation.prototype.write = function(value, opt_callback) {
  // TODO(rpaquay): Add error handling
  this.stream.fileSystem.sendRequest({
    cmd: 'writable-stream.write',
    streamId: this.stream.id,
    value: value
  }).then(
    function() {
      if (opt_callback) {
        opt_callback();
      }
    }
  );
};

/**
 * @override
 * @return {void}
 */
WritableStreamImplementation.prototype.end = function() {
  // TODO(rpaquay): Add error handling
  this.stream.fileSystem.sendRequest({
    cmd: 'writable-stream.end',
    streamId: this.stream.id
  }).then(
    function() {
      this.onFinish.fire();
    }
  );
};
