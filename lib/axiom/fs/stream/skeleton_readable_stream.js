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
import AxiomError from 'axiom/core/error';

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef SkeletonFileSystem$$module$axiom$fs$stream$skeleton_file_system */
var SkeletonFileSystem;

/**
 * @constructor
 * @extends {Ephemeral}
 *
 * @param {!SkeletonFileSystem} fileSystem
 * @param {!string} id
 */
var SkeletonReadableStream = function(fileSystem, id) {
  Ephemeral.call(this);
  /** @const @type {!SkeletonFileSystem} */
  this.fileSystem = fileSystem;

  /** @const @type {!string} */
  this.id = id;

  /** @const @type {!ReadableStream} */
  this.stream = null; // TODO(rpaquay)
};

export default SkeletonReadableStream;

SkeletonReadableStream.prototype = Object.create(Ephemeral.prototype);
