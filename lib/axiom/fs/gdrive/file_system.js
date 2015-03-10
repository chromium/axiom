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
import Path from 'axiom/fs/path';

import ExecuteContext from 'axiom/fs/base/execute_context';
import FileSystem from 'axiom/fs/base/file_system';
import FileSystemManager from 'axiom/fs/base/file_system_manager';

import GDriveOpenContext from 'axiom/fs/gdrive/open_context';
import gdrivefsUtil from 'axiom/fs/gdrive/gdrivefs_util';

/** @typedef OpenContext$$module$axiom$fs$base$open_context */
var OpenContext;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/**
 * @constructor @extends {FileSystem}
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} name The file system name
 */
export var GDriveFileSystem = function(fileSystemManager, name) {
  FileSystem.call(this, fileSystemManager, name);

  /** @type {string} */
  this.description = 'GDrive file system';
};

export default GDriveFileSystem;

GDriveFileSystem.prototype = Object.create(FileSystem.prototype);

GDriveFileSystem.available = function() {
  // The best guess absent an actual attempt to mount, which involves the
  // modal authorization flow.
  return !!navigator;
};

/**
 * @private
 * @param {Path} path
 * @return {!boolean}
 */
GDriveFileSystem.prototype.isValidPath_ = function(path) {
  return !!(path && path.isValid && path.root === this.name);
};

/**
 * Loads GDrive API client, authenticates the user, and requests user's
 * authorization for the app to access their GDrive. After this process is done,
 * the GDrive FS is ready to be used.
 *
 * @override
 * @return {!Promise<undefined>} Operation completion.
 */
GDriveFileSystem.prototype.init = function() {
  return gdrivefsUtil.initGDrive();
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!StatResult>}
 */
GDriveFileSystem.prototype.stat = function(path) {
  return gdrivefsUtil.statEntry(path);
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!Object<string, StatResult>>}
 */
GDriveFileSystem.prototype.list = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return gdrivefsUtil.listDirectory(path);
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<undefined>}
 */
GDriveFileSystem.prototype.mkdir = function(path) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
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
 * @param {Path} fromPathSpec
 * @param {Path} toPathSpec
 * @return {!Promise<undefined>}
 */
GDriveFileSystem.prototype.alias = function(fromPathSpec, toPathSpec) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * Move an entry from a path on this file system to a different path on this
 * file system.
 *
 * If the "from" path is on a different fs, we'll forward the call.  If "from"
 * is on this fs but "to" is not, the move will fail.
 *
 * The destination path must refer to a file that does not yet exist, inside a
 * directory that does.
 *
 * @override
 * @param {Path} fromPathSpec
 * @param {Path} toPathSpec
 * @return {!Promise<undefined>}
 */
GDriveFileSystem.prototype.move = function(fromPathSpec, toPathSpec) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
 * @param {Path} path
 * @return {Promise}
 */
GDriveFileSystem.prototype.unlink = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
 * @param {!Path} path
 * @param {Object} arg
 * @return {!Promise<!ExecuteContext>}
 */
GDriveFileSystem.prototype.createExecuteContext = function(path, arg) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return Promise.reject(new AxiomError.NotImplemented(
      'GDrive filesystem is not executable.'));
};

/**
 * @override
 * @param {Path} path
 * @param {string|OpenMode} mode
 * @return {!Promise<!OpenContext>}
 */
GDriveFileSystem.prototype.createOpenContext = function(path, mode) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  /** @type {!OpenContext} */
  var cx = new GDriveOpenContext(this, path, mode);
  return Promise.resolve(cx);
};
