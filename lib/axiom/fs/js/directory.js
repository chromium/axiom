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

  /** @type {Map<string, (JsEntry|FileSystem)>} */
  this.entryMap_ = new Map();
};

export default JsDirectory;

JsDirectory.prototype = Object.create(JsEntry.prototype);

/**
 * @override
 * Return the stat() result for this directory.
 */
JsDirectory.prototype.stat = function() {
  return JsEntry.prototype.stat.call(this).then(
      function(rv) {
        rv['count'] = this.entryMap_.size;
        return Promise.resolve(rv);
      }.bind(this));
};

/**
 * Resolve a Path object as far as possible.
 *
 * This may return a partial result which represents the depth to which
 * the path can be resolved.
 *
 * @param {Path} path An object representing the path to resolve.
 * @param {number=} opt_index The optional index into the path elements where
 *   we should start resolving.  Defaults to 0, the first path element.
 * @return {JsResolveResult}
 */
JsDirectory.prototype.resolve = function(path, opt_index) {
  var index = opt_index || 0;

  if (!this.entryExists(path.elements[index])) {
    return new JsResolveResult(
        path.elements.slice(0, index - 1),
        path.elements.slice(index - 1),
        this);
  }

  var entry = this.entryMap_.get(path.elements[index]) || null;

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
 */
JsDirectory.prototype.entryExists = function(name) {
  return this.entryMap_.has(name);
};

/**
 * Link the given entry into this directory.
 *
 * This method is not directly reachable through the FileSystem.
 *
 * @param {string} name  A name to give the entry.
 * @param {JsEntry} entry
 */
JsDirectory.prototype.link = function(name, entry) {
  if (!(entry instanceof JsEntry))
    throw new AxiomError.TypeMismatch('instanceof JsEntry', entry);

  if (this.entryMap_.has(name))
    throw new AxiomError.Duplicate('directory-name', name);

  this.entryMap_.set(name, entry);
};

/**
 * Link the given FileSystem into this directory.
 *
 * This method is not directly reachable through the FileSystem.
 *
 * @param {string} name  A name to give the file system.
 * @param {FileSystem} fileSystem
 */
JsDirectory.prototype.mount = function(name, fileSystem) {
  if (!(fileSystem instanceof FileSystem)) {
    throw new AxiomError.TypeMismatch('instanceof FileSystem',
                                      fileSystem);
  }

  if (this.entryMap_.has(name))
    throw new AxiomError.Duplicate('directory-name', name);

  this.entryMap_.set(name, fileSystem);
};

/**
 * @param {Object<string, function(JsExecuteContext)>} executables
 */
JsDirectory.prototype.install = function(executables) {
  for (var name in executables) {
    var callback = executables[name];
    var sigil;
    var ary = /([^\(]*)\(([^\)]?)\)$/.exec(name);
    if (ary) {
      name = ary[1];
      sigil = ary[2];
      if (sigil && '$@%*'.indexOf(sigil) == -1)
        throw new AxiomError.Invalid('sigil', sigil);
    } else {
      sigil = executables[name]['argSigil'] || '*';
    }

    this.link(name, new JsExecutable(this.jsfs, callback, sigil));
  }
};

/**
 * Make a new, empty directory with the given name.
 *
 * @param {string} name
 */
JsDirectory.prototype.mkdir = function(name) {
  if (this.entryExists(name))
    return Promise.reject(new AxiomError.Duplicate('directory-name', name));

  var dir = new JsDirectory(this.jsfs);
  this.entryMap_.set(name, dir);
  return Promise.resolve(dir);
};

/**
 * Remove the entry with the given name.
 *
 * @param {string} name
 * @return {Promise}
 */
JsDirectory.prototype.unlink = function(name) {
  if (!this.entryExists(name))
    return Promise.reject(new AxiomError.NotFound('name', name));

  this.entryMap_.delete(name);
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

  this.entryMap_.forEach(function(entry, name) {
    var promise;

    if (entry instanceof FileSystem) {
      promise = entry.stat('/');
    } else {
      promise = entry.stat();
    }

    promises.push(promise.then(function(statResult) {
      rv[name] = statResult;
    }));
    }, null);

  return Promise.all(promises).then(function() {
    return rv;
  });
};
