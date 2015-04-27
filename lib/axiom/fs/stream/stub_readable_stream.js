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
 * Forward all events and function calls from a local ReadableStream
 * implementation to its corresponding remote stream (given its remote id).
 *
 * @constructor
 * @extends {Ephemeral}
 *
 * @param {!StubFileSystem} fileSystem  the owner file system
 * @param {!ReadableStream} stream  the local stream instance
 * @param {!string} name  the stream name in its stdio container
 * @param {!string} id  the remote stream id
 */
var StubReadableStream = function(fileSystem, stream, name, id) {
  Ephemeral.call(this);

  /** @const @type {!StubFileSystem} */
  this.fileSystem = fileSystem;
  /** @const @type {!ReadableStream} */
  this.stream = stream;
  /** @const @type {!string} */
  this.name = name;
  /** @const @type {!string} */
  this.id = id;

  this.onClose.addListener(function(reason, value) {
    // TODO(rpaquay): Handle returned promise?
    this.fileSystem.sendRequest_({
        cmd: 'readable-stream.close',
        streamId: this.id,
        closeReason: reason,
        closeValue: value});
  }.bind(this));

  this.stream.onClose.addListener(function() {
    // TODO(rpaquay): Should this be "closeError"?
    this.closeOk();
  }.bind(this));

  this.stream.onData.addListener(function(value) {
    // TODO(rpaquay): Handle returned promise?
    this.fileSystem.sendRequest_({
        cmd: 'readable-stream.onData',
        streamId: this.id,
        value: value});
  }.bind(this));

  this.stream.onReadable.addListener(function() {
    // TODO(rpaquay): Handle returned promise?
    this.fileSystem.sendRequest_({
        cmd: 'readable-stream.onReadable',
        streamId: this.id});
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
  this.stream.pause();
};

/**
 * Switch the stream to flowing mode, onData events are fired when data is
 * available.
 *
 * @return {void}
 */
StubReadableStream.prototype.resume = function() {
  this.stream.resume();
};

/**
 * When the stream is in paused mode, read one value from the stream, or return
 * undefined when the stream is empty.
 *
 * @return {*}
 */
StubReadableStream.prototype.read = function() {
  return this.stream.read();
};
