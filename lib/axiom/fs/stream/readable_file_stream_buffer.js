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
import StreamBuffer from 'axiom/fs/stream/stream_buffer';
import ReadableMemoryStream from 'axiom/fs/stream/readable_memory_stream';

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef Path$$module$axiom$fs$path */
var Path;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/**
 * @constructor @extends {StreamBuffer}
 * @param {!FileSystem} fileSystem
 * @param {Path} filePath
 * @param {?DataType} dataType
 * @param {!OpenMode} fileMode
 */
export var ReadableFileStreamBuffer = function(
    fileSystem, filePath, dataType, openMode) {
  StreamBuffer.call(this);

  /** @const @type {!ReadableStream} */
  this.readableStream = new ReadableMemoryStream(this);
  
  // TODO(ussuri): This reads the whole file at once. Rework to support true
  // streaming on file systems that support it.
  fileSystem.readFile(filePath, dataType || DataType.UTF8String, openMode)
    .then(function(readResult) {
      readResult.data.split('\n').forEach(function(line) {
        this.write(line + '\n');
      }.bind(this));
      // This will indirectly fire a chain onFlush -> this.readableStream.onEnd.
      StreamBuffer.prototype.flush.call(this);
    }.bind(this));
};

export default ReadableFileStreamBuffer;

ReadableFileStreamBuffer.prototype = Object.create(StreamBuffer.prototype);
