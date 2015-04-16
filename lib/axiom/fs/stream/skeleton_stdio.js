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
import Stdio from 'axiom/fs/stdio';

/** @typedef SkeletonReadableStream$$module$axiom$fs$stream$skeleton_readable_stream */
var SkeletonReadableStream;

/** @typedef SkeletonWritableStream$$module$axiom$fs$stream$skeleton_writable_stream */
var SkeletonWritableStream;

/**
 * @constructor
 * @extends {Ephemeral}
 */
var SkeletonStdio = function() {
  Ephemeral.call(this);

  /**
   * @type {Object<!string, !SkeletonReadableStream>}
   */
  this.readableStreams = {};

  /**
   * @type {Object<!string, !SkeletonWritableStream>}
   */
  this.writableStreams = {};
};

export default SkeletonStdio;

SkeletonStdio.prototype = Object.create(Ephemeral.prototype);

SkeletonStdio.prototype.getStdio = function() {
  // TODO(rpaquay): There should be a more generic way of achieving this.
  var stdin = this.readableStreams['stdin'].stream;
  var stdout = this.writableStreams['stdout'].stream;
  var stderr = this.writableStreams['stderr'].stream;
  var signal = this.readableStreams['signal'].stream;
  var ttyin = this.readableStreams['ttyin'].stream;
  var ttyout = this.writableStreams['ttyout'].stream;
  var result = new Stdio(stdin, stdout, stderr, signal, ttyin, ttyout);

  // Copy additional named streams
  for (var name in this.readableStreams) {
    result[name] = this.readableStreams[name].stream;
  }

  // Copy additional named streams
  for (var name in this.writableStreams) {
    result[name] = this.writableStreams[name].stream;
  }

  return result;
};
