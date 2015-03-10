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

import AxiomError from 'axiom/core/error';

import Path from 'axiom/fs/path';

import FileSystem from 'axiom/fs/base/file_system';

import JsEntry from 'axiom/fs/js/entry';
import JsExecutable from 'axiom/fs/js/executable';
import JsResolveResult from 'axiom/fs/js/resolve_result';

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
var JsFileSystem;

/**
 * @constructor @extends {JsEntry}
 * A directory in a JsFileSystem.
 *
 * A directory can contain JsEntry subclasses and/or FileSystems.
 *
 * @param {JsFileSystem} jsfs  The parent file system.
 */
export var JsDirectory = function(jsfs) {
  JsEntry.call(this, jsfs, 'D');

  /** @type {Object<string, (JsEntry|FileSystem)>} */
  this.entries_ = {};
};

export default JsDirectory;

JsDirectory.prototype = Object.create(JsEntry.prototype);

/**
 * Resolve a Path object as far as possible.
 *
 * This may return a partial result which represents the depth to which
 * the path can be resolved.
 *
 * @param {Path} path An object representing the path to resolve.
 * @param {number=} opt_index The optional index into the path elements where
 *   we should start resolving.  Defaults to 0, the first path element.
 * @return {!JsResolveResult}
 */
JsDirectory.prototype.resolve = function(path, opt_index) {
  var index = opt_index || 0;

  if (!this.entryExists(path.elements[index])) {
    return new JsResolveResult(
        path.elements.slice(0, index),
        path.elements.slice(index),
        this);
  }

  var entry = this.entries_[path.elements[index]] || null;

  if (index == path.elements.length - 1)
    return new JsResolveResult(path.elements, null, entry);

  if (entry instanceof JsDirectory)
    return entry.resolve(path, index + 1);

  return new JsResolveResult(path.elements.slice(0, index + 1),
                             path.elements.slice(index + 1),
                             entry);
};

/**
 * Return true if the named entry exists in this directory.
 *
 * @param {string} name
 * @return {!boolean}
 */
JsDirectory.prototype.entryExists = function(name) {
  return this.entries_.hasOwnProperty(name);
};

/**
 * Link the given entry into this directory.
 *
 * This method is not directly reachable through the FileSystem.
 *
 * @param {string} name  A name to give the entry.
 * @param {JsEntry} entry
 * @return {void}
 */
JsDirectory.prototype.link = function(name, entry) {
  if (!(entry instanceof JsEntry))
    throw new AxiomError.TypeMismatch('instanceof JsEntry', entry);

  if (this.entries_.hasOwnProperty(name))
    throw new AxiomError.Duplicate('directory-name', name);

  this.entries_[name] = entry;
};

/**
 * Link the given FileSystem into this directory.
 *
 * This method is not directly reachable through the FileSystem.
 *
 * @param {string} name  A name to give the file system.
 * @param {FileSystem} fileSystem
 * @return {void}
 */
JsDirectory.prototype.mount = function(name, fileSystem) {
  if (!(fileSystem instanceof FileSystem)) {
    throw new AxiomError.TypeMismatch('instanceof FileSystem',
                                      fileSystem);
  }

  if (this.entries_.hasOwnProperty(name))
    throw new AxiomError.Duplicate('directory-name', name);

  this.entries_[name] = fileSystem;
};

/**
 * @param {Object<string, (function(JsExecuteContext)|Array)>} executables
 * @return {void}
 */
JsDirectory.prototype.install = function(executables) {
  for (var name in executables) {
    var callback;
    var signature;

    if (typeof executables[name] == 'function') {
      callback = executables[name];
      signature = callback['signature'] || {};
    } else if (typeof executables[name] == 'object' &&
        executables[name].length == 2) {
      callback = executables[name][1];
      signature = executables[name][0];
    } else {
      throw new AxiomError.Invalid('callback: ' + name, executables[name]);
    }

    this.link(name, new JsExecutable(this.jsfs, callback, signature));
  }
};

/**
 * Make a new, empty directory with the given name.
 *
 * @param {string} name
 * @return {!Promise<!JsDirectory>}
 */
JsDirectory.prototype.mkdir = function(name) {
  if (this.entryExists(name))
    return Promise.reject(new AxiomError.Duplicate('directory-name', name));

  var dir = new JsDirectory(this.jsfs);
  this.entries_[name] = dir;
  return Promise.resolve(dir);
};

/**
 * Remove the entry with the given name.
 *
 * @param {string} name
 * @return {!Promise}
 */
JsDirectory.prototype.unlink = function(name) {
  if (!this.entryExists(name))
    return Promise.reject(new AxiomError.NotFound('name', name));

  delete this.entries_[name];
  return Promise.resolve();
};

/**
 * Return the stat() result for each item in this directory.
 *
 * @return {!Promise<!Object<string, StatResult>>}
 */
JsDirectory.prototype.list = function() {
  var rv = {};
  var promises = [];

  for (var name in this.entries_) {
    var entry = this.entries_[name];
    var promise;

    if (entry instanceof FileSystem) {
      promise = entry.stat(entry.rootPath);
    } else {
      promise = entry.stat();
    }

    promises.push(promise.then(function(name, statResult) {
      rv[name] = statResult;
    }.bind(null, name)));
  }

  return Promise.all(promises).then(function() {
    return rv;
  });
};
