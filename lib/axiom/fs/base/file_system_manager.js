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

import OpenContext from 'axiom/fs/base/open_context';
import FileSystem from 'axiom/fs/base/file_system';
import Stdio from 'axiom/fs/stdio';

import Path from 'axiom/fs/path';
import SeekWhence from 'axiom/fs/seek_whence';
import DataType from 'axiom/fs/data_type';

/** @typedef {ExecuteContext$$module$axiom$fs$base$execute_context} */
var ExecuteContext;

/** @typedef {OpenMode$$module$axiom$fs$open_mode} */
var OpenMode;

/** @typedef {ReadResult$$module$axiom$fs$read_result} */
var ReadResult;

/** @typedef {WriteResult$$module$axiom$fs$write_result} */
var WriteResult;

/** @typedef {StatResult$$module$axiom$fs$stat_result} */
var StatResult;

/**
 * @constructor @extends {FileSystem}
 */
export var FileSystemManager = function() {
  FileSystem.call(this, this, '');

  /**
   * The known file systems, by name.
   * @private
   * @type {!Object<string, FileSystem>}
   */
  this.fileSystems_ = {};

  /**
   * The "default" file system, i.e. the first file system mounted.
   * @type {FileSystem}}
   */
  this.defaultFileSystem = null;
};

export default FileSystemManager;

FileSystemManager.prototype = Object.create(FileSystem.prototype);

/**
 * Return the file system instance identified by the given path.
 * Throws an error if the file system does not exist.
 *
 * @private
 * @param {Path} path
 * @return {FileSystem}
 */
FileSystemManager.prototype.getFileSystem_ = function(path) {
  if (!this.fileSystems_.hasOwnProperty(path.root)) {
    throw new AxiomError.NotFound('filesystem-name', path.root);
  }

  return this.fileSystems_[path.root];
};

/**
 * Return the list of currently mounted file systems.
 *
 * @return {Array<FileSystem>}
 */
FileSystemManager.prototype.getFileSystems = function() {
  var result = [];
  for(var key in this.fileSystems_) {
    result.push(this.fileSystems_[key]);
  }
  return result;
};

/**
 * Mount a file system. The file system must have a unique name.
 *
 * @param {!FileSystem} fileSystem
 * @return {void}
 */
FileSystemManager.prototype.mount = function(fileSystem) {
  if (this.fileSystems_.hasOwnProperty(fileSystem.name)) {
    throw new AxiomError.Duplicate('filesystem-name', fileSystem.name);
  }

  this.fileSystems_[fileSystem.name] = fileSystem;
  if (!this.defaultFileSystem)
    this.defaultFileSystem = fileSystem;
};

/**
 * Create an alias from a path on this file system to a different path on this
 * file system.
 *
 * If the "from" path is on a different fs, we'll forward the call.  If "from"
 * is on this fs but "to" is not, the move will fail.
 *
 * The destination path must refer to a file that does not yet exist, inside a
 * directory that does.
 *
 * @override
 * @param {Path} pathFrom
 * @param {Path} pathTo
 * @return {!Promise<undefined>}
 */
FileSystemManager.prototype.alias = function(pathFrom, pathTo) {
  var fileSystem = this.getFileSystem_(pathFrom);
  return fileSystem.alias(pathFrom, pathTo);
};

/**
 * @override
 * @param {!Path} path
 * @param {!Stdio} stdio
 * @param {Object} arg
 * @return {!Promise<!ExecuteContext>}
 */
FileSystemManager.prototype.createExecuteContext = function(path, stdio, arg) {
  var fileSystem = this.getFileSystem_(path);
  return fileSystem.createExecuteContext(path, stdio, arg);
};

/**
 * @override
 * @param {Path} path
 * @param {string|OpenMode} mode
 * @return {!Promise<!OpenContext>}
 */
FileSystemManager.prototype.createOpenContext = function(path, mode) {
  var fileSystem = this.getFileSystem_(path);
  return fileSystem.createOpenContext(path, mode);
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!Object<string, StatResult>>}
 */
FileSystemManager.prototype.list = function(path) {
  var fileSystem = this.getFileSystem_(path);
  return fileSystem.list(path);
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<undefined>}
 */
FileSystemManager.prototype.mkdir = function(path) {
  var fileSystem = this.getFileSystem_(path);
  return fileSystem.mkdir(path);
};

/**
 * @private
 * @param {Path} fromPath
 * @param {Path} toPath
 * @param {isMove} Whether the operation to do is move (vs. copy).
 * @return {!Promise<undefined>}
 */
FileSystemManager.prototype.copyOrMove_ = function(fromPath, toPath, isMove) {
  var fromFs = this.getFileSystem_(fromPath);
  var toFs = this.getFileSystem_(toPath);
  var promise;
  if (fromFs == toFs) {
    promise = isMove ?
        fromFs.move(fromPath, toPath) :
        fromFs.copy(fromPath, toPath);
  } else {
    promise = fromFs.readFile(fromPath)
      .then(function(readResult) {
        return toFs.writeFile(toPath, readResult.dataType, readResult.data);
      })
      .then(function() {
        return isMove ? fromFs.unlink(fromPath) : Promise.resolve();
      });
  }
  return promise;
};

/**
 * Copy an entry from a path on a file system to a different path on the
 * same file system.
 *
 * The destination path must refer to a file that does not yet exist, inside a
 * directory that does.
 *
 * @override
 * @param {Path} fromPath
 * @param {Path} toPath
 * @return {!Promise<undefined>}
 */
FileSystemManager.prototype.copy = function(fromPath, toPath) {
  return this.copyOrMove_(fromPath, toPath, false);
};

/**
 * Move an entry from a path on a file system to a different path on the
 * same file system.
 *
 * The destination path must refer to a file that does not yet exist, inside a
 * directory that does.
 *
 * @override
 * @param {Path} fromPath
 * @param {Path} toPath
 * @return {!Promise<undefined>}
 */
FileSystemManager.prototype.move = function(fromPath, toPath) {
  return this.copyOrMove_(fromPath, toPath, true);
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!StatResult>}
 */
FileSystemManager.prototype.stat = function(path) {
  var fileSystem = this.getFileSystem_(path);
  return fileSystem.stat(path);
};

/**
 * Remove the given path.
 *
 * @override
 * @param {Path} path
 * @return {Promise}
 */
FileSystemManager.prototype.unlink = function(path) {
  var fileSystem = this.getFileSystem_(path);
  return fileSystem.unlink(path);
};

/**
 * Installs a list of executables represented by an object into /exe.
 *
 * @param {Path} path
 * @param {*} An object with callback entries to be installed
 * @return {void}
 */
FileSystemManager.prototype.install = function(obj) {
  this.defaultFileSystem.install(obj);
};
