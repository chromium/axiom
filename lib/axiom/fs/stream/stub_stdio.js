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

/** @typedef StubReadableStream$$module$axiom$fs$stream$stub_readable_stream */
var StubReadableStream;

/** @typedef StubWritableStream$$module$axiom$fs$stream$stub_writable_stream */
var StubWritableStream;

/**
 * @constructor
 * @extends {Ephemeral}
 * @param {!Stdio} parentStdio
 */
var StubStdio = function(parentStdio) {
  Ephemeral.call(this);

  /**
   * @const @type {!Stdio}
   */
  this.parentStdio_ = parentStdio;

  /**
   * @type {Object<!string, !StubReadableStream>}
   */
  this.readableStreams = {};

  /**
   * @type {Object<!string, !StubWritableStream>}
   */
  this.writableStreams = {};
};

export default StubStdio;

StubStdio.prototype = Object.create(Ephemeral.prototype);

/**
 * @return {!Object<!string,!string>}
 */
StubStdio.prototype.getStreams = function() {
  var result = {};
  for(var key in this.readableStreams) {
    var stream = this.readableStreams[key];
    result[stream.name] = stream.id;
  }
  for(var key in this.writableStreams) {
    var stream = this.writableStreams[key];
    result[stream.name] = stream.id;
  }
  return result;
};

/**
 * @return {!Stdio}
 */
StubStdio.prototype.getStdio = function() {
  return this.parentStdio_;
};
