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
import WritableStreamSource from 'axiom/fs/stream/writable_stream_source';

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef Path$$module$axiom$fs$path */
var Path;

/** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
var StreamsSource;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * @constructor
 * @extends {StreamBuffer}
 * @implements {StreamsSource}
 *
 * @param {!FileSystem} fileSystem
 * @param {Path} filePath
 * @param {?DataType} dataType
 * @param {!OpenMode} openMode
 */
export var WritableFileStreamBuffer = function(
    fileSystem, filePath, dataType, openMode) {
  StreamBuffer.call(this);

  /** @const @type {!WritableStreamSource} */
  this.writableStream = new WritableStreamSource(this);

  this.writableStream.onFinish.listenOnce(function() {
    // This will flush unsaved data to the file and fire onFlush.
    StreamBuffer.prototype.flush.call(this);
  }.bind(this));
  
  dataType = dataType || DataType.UTF8String;

  fileSystem.createOpenContext(filePath, openMode)
    .then(function(cx) {
      cx.open().then(function() {
        this.onData.addListener(function(data) {
          // TODO(ussuri): Can fast successive writes step on each other here?
          cx.write(0, SeekWhence.End, dataType, data);
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
