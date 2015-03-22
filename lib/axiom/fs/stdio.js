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
 * @constructor 
 * @param {!ReadableStream} stdin
 * @param {!WritableStream} stdout
 * @param {!WritableStream} stderr
 * @param {!ReadableStream} ttyin
 * @param {!WritableStream} ttyout
 */
export var Stdio = function(stdin, stdout, stderr, ttyin, ttyout) {
  /** @const @type {!ReadableStream} */
  this.stdin = stdin;
  /** @const @type {!WritableStream} */
  this.stdout = stdout;
  /** @const @type {!WritableStream} */
  this.stderr = stderr;
  /** @const @type {!ReadableStream} */
  this.ttyin = ttyin;
  /** @const @type {!WritableStream} */
  this.ttyout = ttyout;
};

export default Stdio;
