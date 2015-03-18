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
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} name The file system name
 */
GDriveFileSystem.mount = function(fileSystemManager, name) {
  var fs = new GDriveFileSystem(fileSystemManager, name);
  return fs.bringOnline().then(function() {
    return fileSystemManager.mount(fs);
  });
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
 * @private
 * @param {...Path} var_args
 */
GDriveFileSystem.prototype.validatePaths_ = function(var_args) {
  for (var i = 0; i < arguments.length; ++i) {
    var path = arguments[i];
    if (!this.isValidPath_(path))
      throw new AxiomError.Invalid('path', path.originalSpec);
  }
};

/**
 * Obtain an initial authorization when the GDrive FS is about to be accessed
 * for the first time in this Axiom session: loads GDrive API client,
 * authenticates the user, and requests the user's authorization for the app
 * to access their GDrive via a browser popup (unless the browser session is
 * already authorized, in which case the popup is not displayed).
 *
 * After this process is done, the GDrive FS is ready to be used.
 *
 * @return {!Promise<undefined>} Operation completion.
 */
GDriveFileSystem.prototype.bringOnline = function() {
  return gdrivefsUtil.initGDrive().then(function() {
    this.ready();
  }.bind(this));
};

/**
 * Re-request user's authorization for the app to access their GDrive if the
 * existing authorization has expired.
 *
 * After this process is done,
 * the GDrive FS is ready to be used.
 *
 * @return {!Promise<undefined>} Operation completion.
 */
GDriveFileSystem.prototype.refreshOnline = function() {
  return gdrivefsUtil.authenticateWithGDrive(true);
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!StatResult>}
 */
GDriveFileSystem.prototype.stat = function(path) {
  this.validatePaths_(path);
  return this.refreshOnline().then(function() {
    return gdrivefsUtil.statEntry(path);
  });
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!Object<string, StatResult>>}
 */
GDriveFileSystem.prototype.list = function(path) {
  this.validatePaths_(path);
  return this.refreshOnline().then(function() {
    return gdrivefsUtil.listDirectory(path);
  });
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
 * @override
 * @param {Path} fromPath
 * @param {Path} toPath
 * @return {!Promise<undefined>}
 */
GDriveFileSystem.prototype.alias = function(fromPath, toPath) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
 * @param {Path} fromPath
 * @param {Path} toPath
 * @return {!Promise<undefined>}
 */
GDriveFileSystem.prototype.move = function(fromPath, toPath) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<undefined>}
 */
GDriveFileSystem.prototype.unlink = function(path) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
 * @param {!Path} path
 * @param {Object} arg
 * @return {!Promise<!ExecuteContext>}
 */
GDriveFileSystem.prototype.createExecuteContext = function(path, arg) {
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
  this.validatePaths_(path);
  return this.refreshOnline().then(function() {
    var cx = new GDriveOpenContext(this, path, mode);
    return Promise.resolve(cx);
  }.bind(this));
};
