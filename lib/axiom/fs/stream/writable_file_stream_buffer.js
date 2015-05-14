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

import AxiomStream from 'axiom/fs/stream/axiom_stream';
import DataType from 'axiom/fs/data_type';
import SeekWhence from 'axiom/fs/seek_whence';
import MemoryStreamBuffer from 'axiom/fs/stream/memory_stream_buffer';
import WritableStreamSource from 'axiom/fs/stream/writable_stream_source';

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef OpenContext$$module$axiom$fs$base$open_context */
var OpenContext;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef Path$$module$axiom$fs$path */
var Path;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * @constructor
 * @extends {AxiomStream}
 * @implements {WritableStream}
 *
 * @param {!FileSystem} fileSystem
 * @param {!Path} filePath
 * @param {!DataType} dataType
 * @param {!string|!OpenMode} openMode
 */
export var WritableFileStreamBuffer = function(
    fileSystem, path, dataType, openMode) {
  AxiomStream.call(this);

  /** @const @type {!FileSystem} */
  this.fileSystem_ = fileSystem;
  /** @const @type {!Path} */
  this.path_ = path;
  /** @const @type {!DataType} */
  this.dataType_ = dataType;
  /** @const @type {!string|!OpenMode} */
  this.openMode_ = openMode;
  /** @const @type {!MemoryStreamBuffer} */
  this.buffer_ = new MemoryStreamBuffer();
  /** @const @type {!AxiomEvent} */
  this.onFinish = this.buffer_.onFinish;
};

export default WritableFileStreamBuffer;

WritableFileStreamBuffer.prototype = Object.create(AxiomStream.prototype);

/**
 * @override
 */
WritableFileStreamBuffer.prototype.write = function(value, opt_callback) {
  this.buffer_.write(value, opt_callback);
};

/**
 * @override
 */
WritableFileStreamBuffer.prototype.end = function() {
  this.buffer_.end();
};

/**
 * @return {!Promise<undefined>}
 */
WritableFileStreamBuffer.prototype.open = function() {
  return this.fileSystem_.createOpenContext(this.path_, this.openMode_)
      .then(function(cx) {
    return cx.open().then(function() {
      this.buffer_.onData.addListener(function(data) {
        // TODO(ussuri): Can fast successive writes step on each other here?
        cx.write(0, SeekWhence.End, this.dataType_, data);
      }.bind(this));
      this.buffer_.onEnd.addListener(function() {
        cx.closeOk();
      }.bind(this));
      this.buffer_.onClose.addListener(function(error) {
        cx.closeError(error);
      }.bind(this));
      this.buffer_.resume();
    }.bind(this));
  }.bind(this));
};
