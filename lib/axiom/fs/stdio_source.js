// Copyright (c) 2015 Google Inc. All rights reserved.
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

import Stdio from 'axiom/fs/stdio';

import MemoryStream from 'axiom/fs/stream/memory_stream';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * A concrete implementation of stdio streams, using MemoryStream as
 * transport (i.e. in-memory queues).
 *
 * @constructor
 */
export var StdioSource = function() {
  /** @const @private @type {!MemoryStream} */
  this.stdinBuffer_ = new MemoryStream();
  /** @const @private @type {!MemoryStream} */
  this.stdoutBuffer_ = new MemoryStream();
  /** @const @private @type {!MemoryStream} */
  this.stderrBuffer_ = new MemoryStream();
  /** @const @private @type {!MemoryStream} */
  this.signalBuffer_ = new MemoryStream();
  /** @const @private @type {!MemoryStream} */
  this.ttyinBuffer_ = new MemoryStream();
  /** @const @private @type {!MemoryStream} */
  this.ttyoutBuffer_ = new MemoryStream();

  /** @const @type {!WritableStream} */
  this.stdin = this.stdinBuffer_.writableStream;
  /** @const @type {!ReadableStream} */
  this.stdout = this.stdoutBuffer_.readableStream;
  /** @const @type {!ReadableStream} */
  this.stderr = this.stderrBuffer_.readableStream;
  /** @const @type {!WritableStream} */
  this.signal = this.signalBuffer_.writableStream;
  /** @const @type {!WritableStream} */
  this.ttyin = this.ttyinBuffer_.writableStream;
  /** @const @type {!ReadableStream} */
  this.ttyout = this.ttyoutBuffer_.readableStream;

  /** @const @type {!Stdio} */
  this.stdio = new Stdio(
    this.stdinBuffer_.readableStream,
    this.stdoutBuffer_.writableStream,
    this.stderrBuffer_.writableStream,
    this.signalBuffer_.readableStream,
    this.ttyinBuffer_.readableStream,
    this.ttyoutBuffer_.writableStream);
};

export default StdioSource;
