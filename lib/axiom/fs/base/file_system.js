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
import Ephemeral from 'axiom/core/ephemeral';

import FileSystemBase from 'axiom/fs/base/file_system_base';

import Path from 'axiom/fs/path';
import SeekWhence from 'axiom/fs/seek_whence';
import DataType from 'axiom/fs/data_type';

/** @typedef {ExecuteContext$$module$axiom$fs$base$execute_context} */
var ExecuteContext;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/** @typedef {OpenMode$$module$axiom$fs$open_mode} */
var OpenMode;

/** @typedef {ReadResult$$module$axiom$fs$read_result} */
var ReadResult;

/** @typedef {WriteResult$$module$axiom$fs$write_result} */
var WriteResult;

/** @typedef {StatResult$$module$axiom$fs$stat_result} */
var StatResult;

/**
 * @constructor @extends {FileSystemBase}
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} name
 */
export var FileSystem = function(fileSystemManager, name) {
  FileSystemBase.call(this);

  /** @type {!FileSystemManager} */
  this.fileSystemManager = fileSystemManager;

  /** @type {!string} */
  this.name = name;

  /** @type {!string} */
  this.description = name;

  /** @type {!Path} */
  this.rootPath = new Path(name + Path.rootSeparator);

  fileSystemManager.register(this);
};

export default FileSystem;

FileSystem.prototype = Object.create(FileSystemBase.prototype);

/**
 * Initialize this file system. Subclassed truly ephemeral file systems should
 * override this if some non-trivial initialization is required for them to go
 * online. They should also at the very least override getState(), and possibly
 * even update their state preemptively as soon as a change in the backing FS
 * occurs (e.g. the access token expires).
 *
 * @return {!Promise<undefined>}
 */
FileSystem.prototype.bringOnline = function() {
  this.ready();
  return Promise.resolve();
};

/**
 * The current state of this file system. Subclasses should override this:
 * - static file systems will typically just call Ephemeral.ready() in their
 *   constructor and leave this method unchanged;
 * - dynamic file systems that are truly ephemeral will typically call
 *   Ephemeral.ready() somewhere in their bringOnline() override and possibly
 *   also override this method to check/update their status on access.
 *
 * @return {!Ephemeral.State}
 */
FileSystem.prototype.getState = function() {
  return this.readyState;
};

/**
 * A shortcut to mount this file system directly when its object is available,
 * as opposed to registering by name.
 *
 * @return {!Promise<!FileSystem>} Operation completion.
 */
FileSystem.prototype.mount = function() {
  return this.fileSystemManager.mount(this.name);
};

/**
 * Returns a {Path} relative to this filesystem with given path
 *
 * @param {string} String path with which to construct {Path}
 * @return {Path} The Path in current root.
 */
FileSystem.prototype.getPath = function(path) {
  var rootName = this.name + Path.rootSeparator;
  return new Path(rootName + path);
};
