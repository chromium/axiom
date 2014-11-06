// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import FileSystemBinding from 'axiom/bindings/fs/file_system';
import Path from 'axiom/fs/path';

import JsEntry from 'axiom/fs/js_entry';
import JsResolveResult from 'axiom/fs/js_resolve_result';

/**
 * A directory in a JsFileSystem.
 *
 * A directory can contain JsEntry subclasses and/or FileSystemBindings.
 *
 * @param {JsFileSystem} jsfs  The parent file system.
 */
export var JsDirectory = function(jsfs) {
  JsEntry.call(this, jsfs, 'd');
  this.entryMap_ = new Map();
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
 * @param {integer} opt_index The optional index into the path elements where
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

  var entry = this.entryMap_.get(path.elements[index]);

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
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {string} name  A name to give the entry.
 * @param {JsEntry}
 */
JsDirectory.prototype.linkEntry = function(name, entry) {
  if (!entry instanceof JsEntry)
    throw new AxiomError.TypeMismatch('instanceof JsEntry', entry);

  if (this.entryMap_.has(name))
    throw new AxiomError.Duplicate('name', name);

  this.entryMap_.set(name, entry);
};

/**
 * Link the given FileSystemBinding into this directory.
 *
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {string} name  A name to give the file system.
 * @param {FileSystemBinding}
 */
JsDirectory.prototype.linkFileSystem = function(name, fileSystemBinding) {
  if (!fileSystemBinding instanceof FileSystemBinding) {
    throw new AxiomError.TypeMismatch('instanceof FileSystemBinding',
                                      fileSystemBinding);
  }

  if (this.entryMap_.has(name))
    throw new AxiomError.Duplicate('name', name);

  this.entryMap_.set(name, fileSystemBinding);
};

/**
 * Make a new, empty directory with the given name.
 *
 * @param {string} name
 */
JsDirectory.prototype.mkdir = function(name) {
  if (this.entryExists(name))
    return Promise.reject(new AxiomError.Duplicate('name', name));

  var dir = new JsDirectory(this.jsfs);
  this.entryMap_.set(name, dir);
  return Promise.resolve(dir);
};

/**
 * Remove the entry with the given name.
 *
 * @param {string} name
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
 * @return {Object}
 */
JsDirectory.prototype.list = function() {
  var rv = {};
  this.entryMap_.forEach(function(entry, name) {
    rv[name] = entry.stat();
  });

  return rv;
};

/**
 * Return the stat() result for this directory.
 */
JsDirectory.prototype.stat = function() {
  var rv = JsEntry.prototype.stat.call(this);
  rv['count'] = this.entryMap_.size;
  return rv;
};
