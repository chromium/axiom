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

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * A Dictionary of named streams, with some predefined ones, such as stdin,
 * stdout, stderr, etc. Additional streams can be added as named properties.
 *
 * @constructor
 * @param {!ReadableStream} stdin
 * @param {!WritableStream} stdout
 * @param {!WritableStream} stderr
 * @param {!ReadableStream} signal  Stream of out-of-band signals from the
 *  ouside world or host (e.g. Ctrl-C).
 * @param {!ReadableStream} ttyin
 * @param {!WritableStream} ttyout
 */
export var Stdio = function(stdin, stdout, stderr, signal, ttyin, ttyout) {
  /** @type {!ReadableStream} */
  this.stdin = stdin;
  /** @type {!WritableStream} */
  this.stdout = stdout;
  /** @type {!WritableStream} */
  this.stderr = stderr;
  /** @type {!ReadableStream} */
  this.signal = signal;
  /** @type {!ReadableStream} */
  this.ttyin = ttyin;
  /** @type {!WritableStream} */
  this.ttyout = ttyout;
};

export default Stdio;

/**
 * @return {void}
 */
Stdio.prototype.close = function() {};
