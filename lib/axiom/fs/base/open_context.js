// Copyright 2014 Google Inc. All rights reserved.
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

import Completer from 'axiom/core/completer';
import Ephemeral from 'axiom/core/ephemeral';
import AxiomError from 'axiom/core/error';
import AxiomEvent from 'axiom/core/event';

import OpenMode from 'axiom/fs/open_mode';
import Path from 'axiom/fs/path';
import ReadResult from 'axiom/fs/read_result';
import WriteResult from 'axiom/fs/write_result';

/** @typedef {DataType$$module$axiom$fs$data_type} */
var DataType;

/** @typedef {FileSystem$$module$axiom$fs$base$file_system} */
var FileSystem;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/** @typedef {SeekWhence$$module$axiom$fs$seek_whence} */
var SeekWhence;

/**
 * @constructor @extends {Ephemeral<undefined>}
 *
 * A context that represents an open file on a FileSystem.
 *
 * You should only create an OpenContext by calling an instance of
 * FileSystemBinding..createContext('open', ...).
 *
 * @param {!FileSystem} fileSystem The parent file system.
 * @param {Path} path
 * @param {string|OpenMode} mode
 */
export var OpenContext = function(fileSystem, path, mode) {
  Ephemeral.call(this);

  /** @type {!FileSystem} */
  this.fileSystem = fileSystem;

  /** @type {!FileSystemManager} */
  this.fileSystemManager = fileSystem.fileSystemManager;

  /** @type {Path} */
  this.path = path;

  if (typeof mode == 'string')
    mode = OpenMode.fromString(mode);

  /** @type {OpenMode} */
  this.mode = mode;

  // If the parent file system is closed, we close too.
  this.dependsOn(this.fileSystem);

  /**
   * @private @type {Completer}
   */
  this.openCompleter_ = null;
};

export default OpenContext;

OpenContext.prototype = Object.create(Ephemeral.prototype);

/**
 * Initiate the open.
 *
 * Returns a promise that completes when the context is ready for
 * read/write/seek operations.
 *
 * Implementers are responsible for setting the "ready" state when
 * "open" is done.
 *
 * @return {!Promise<undefined>}
 */
OpenContext.prototype.open = function() {
  this.assertEphemeral('Wait');
  return Promise.resolve();
};

/**
 * Returns a promise that completes when the "seek" operation is done.
 *
 * @param {number} offset
 * @param {SeekWhence} whence
 * @return {!Promise<undefined>}
 */
OpenContext.prototype.seek = function(offset, whence) {
  this.assertEphemeral('Ready');
  return Promise.resolve();
};

/**
 * Returns a promise that completes when the "read" operation is done.
 *
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} dataType
 * @return {!Promise<!ReadResult>}
 */
OpenContext.prototype.read = function(offset, whence, dataType) {
  this.assertEphemeral('Ready');
  if (!this.mode.read)
    return Promise.reject(new AxiomError.Invalid('mode.read', this.mode.read));

  return Promise.resolve(new ReadResult(offset, whence, dataType));
};

/**
 * Returns a promise that completes when the "write" opteration is done.
 *
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} dataType
 * @param {*} data
 * @return {!Promise<!WriteResult>}
 */
OpenContext.prototype.write = function(offset, whence, dataType, data) {
  this.assertEphemeral('Ready');
  if (!this.mode.write) {
    return Promise.reject(new AxiomError.Invalid('mode.write',
                                                 this.mode.write));
  }

  return Promise.resolve(new WriteResult(offset, whence, dataType));
};
