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
import ReadableStreamSource from 'axiom/fs/stream/readable_stream_source';
import SeekWhence from 'axiom/fs/seek_whence';
import StreamBuffer from 'axiom/fs/stream/stream_buffer';

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef OpenContext$$module$axiom$fs$base$open_context */
var OpenContext;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef Path$$module$axiom$fs$path */
var Path;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
var StreamsSource;

/**
 * @constructor
 * @extends {StreamBuffer}
 * @implements {StreamsSource}
 *
 * @param {!FileSystem} fileSystem
 * @param {!Path} path
 * @param {!DataType} dataType
 * @param {!string|!OpenMode} openMode
 */
export var ReadableFileStreamBuffer = function(
    fileSystem, path, dataType, openMode) {
  StreamBuffer.call(this);

  /** @const @type {!FileSystem} */
  this.fileSystem_ = fileSystem;

  /** @const @type {!Path} */
  this.path_ = path;

  /** @const @type {!DataType} */
  this.dataType_ = dataType;

  /** @const @type {!string|!OpenMode} */
  this.openMode_ = openMode;

  /** @const @type {!ReadableStreamSource} */
  this.readableStream = new ReadableStreamSource(this);
};

export default ReadableFileStreamBuffer;

ReadableFileStreamBuffer.prototype = Object.create(StreamBuffer.prototype);

/**
 * @return {!Promise<undefined>}
 */
ReadableFileStreamBuffer.prototype.open = function() {
  // Read the whole file and write it to ourselves.
  // TODO(rpaquay): Temporary until we have a nice way to stream over file
  // contents in chunks.
  return this.fileSystem_.readFile(this.path_, this.dataType_, this.openMode_)
      .then(function(readResult) {
    this.write(readResult.data);
    this.end();
  }.bind(this));
};
