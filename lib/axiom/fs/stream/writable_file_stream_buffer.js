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

import DataType from 'axiom/fs/data_type';
import SeekWhence from 'axiom/fs/seek_whence';
import StreamBuffer from 'axiom/fs/stream/stream_buffer';
import WritableMemoryStream from 'axiom/fs/stream/writable_memory_stream';

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef Path$$module$axiom$fs$path */
var Path;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * @constructor @extends {StreamBuffer}
 *
 * @param {!FileSystem} fileSystem
 * @param {Path} filePath
 * @param {!OpenMode} fileMode
 * @param {string=} opt_name
 */
export var WritableFileStreamBuffer = function(
    fileSystem, filePath, fileMode, opt_name) {
  StreamBuffer.call(this, 'WritableFileStreamBuffer ' +
      (opt_name || '<unnamed>'));

  /** @const @type {!WritableStream} */
  this.writableStream = new WritableMemoryStream(this);

  this.writableStream.onFinish.listenOnce(function() {
    // This will flush unsaved data to the file and fire onFlush.
    StreamBuffer.prototype.flush.call(this);
  }.bind(this));

  fileSystem.createOpenContext(filePath, fileMode)
    .then(function(cx) {
      cx.open().then(function() {
        this.onData.addListener(function(data) {
          cx.write(0, SeekWhence.End, DataType.UTF8String, data);
        });
        this.resume();
      }.bind(this));
    }.bind(this));
};

export default WritableFileStreamBuffer;

WritableFileStreamBuffer.prototype = Object.create(StreamBuffer.prototype);

/**
 * @override
 * @return {void}
 */
WritableFileStreamBuffer.prototype.flush = function() {
  StreamBuffer.prototype.flush.call(this);
  // This will fire an event chain this.writableStream.onFinish -> this.onFlush.
  this.writableStream.end();
};
