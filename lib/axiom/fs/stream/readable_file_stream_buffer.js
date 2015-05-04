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
 * @param {Path} filePath
 * @param {?DataType} dataType
 * @param {!string|!OpenMode} fileMode
 * @param {?number} opt_chunkSize
 * @param {string=} opt_name
 */
export var ReadableFileStreamBuffer = function(
    fileSystem, filePath, dataType, openMode, chunkSize, opt_name) {
  StreamBuffer.call(this, 'ReadableFileStreamBuffer ' +
      (opt_name || '<unnamed>'));

  /** @const @type {!ReadableStreamSource} */
  this.readableStream = new ReadableStreamSource(this);

  /** @const @type {?DataType} */
  this.dataType_ = dataType;
  /** @const @type {!number} */
  this.chunkSize_ = chunkSize || ReadableFileStreamBuffer.CHUNK_SIZE_;
  /** @type {OpenContext} */
  this.cx_ = null;

  this.openPromise_ = fileSystem.createOpenContext(filePath, openMode)
    .then(function(cx) {
      this.cx_ = cx;
      return cx.open();
    }.bind(this));
};

export default ReadableFileStreamBuffer;

ReadableFileStreamBuffer.prototype = Object.create(StreamBuffer.prototype);

/**
 * @const @private
 */
ReadableFileStreamBuffer.CHUNK_SIZE_ = 1024;

/**
 * @return {!Promise<undefined>}
 */
ReadableFileStreamBuffer.prototype.open = function() {
  return this.openPromise_
    .then(function() {
      this.readChunk_();
      return Promise.resolve();
    }.bind(this))
    .catch(function(error) {
      // Delay closing until the consumer resumes the stream; if the consumer
      // attaches a listener to the stream's onClose, it will receive it then.
      this.write('', function() {
        // Fire an event chain: this.onClose -> this.readableStream.onClose.
        this.close(error);
      }.bind(this));
      return Promise.reject(error);
    }.bind(this));
};

/**
 * @private
 * @return {void}
 */
ReadableFileStreamBuffer.prototype.readChunk_ = function() {
  // TODO(ussuri): OpenContext.read doesn't yet understand chunk size: fix that.
  this.cx_.read(0, SeekWhence.Current, this.dataType_/*, this.chunkSize_*/)
    .then(function(data) {
      this.write(data.data);
      // Recurse into reading the next chunk.
      // TODO(ussuri): This is far from ideal (e.g. can exhaust the stack).
      this.readChunk_();
    }.bind(this))
    .catch(function(error) {
      if (AxiomError.OutOfRange.test(error)) {
        // Fire an event chain: onFlush -> this.readableStream.onEnd.
        this.flush();
      } else {
        // Delayed closing will result in flushing of any remaining events to
        // the consumers (first).
        this.write('', function() {
          this.close(error);
        }.bind(this));
      }
    }.bind(this));
};
