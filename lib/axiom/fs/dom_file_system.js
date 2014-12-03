// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import FileSystemBinding from 'axiom/bindings/fs/file_system';

import Path from 'axiom/fs/path';
//import JsExecuteContext from 'axiom/fs/dom_execute_context';
import DomOpenContext from 'axiom/fs/dom_open_context';

/**
 * @param {FileSystemBinding} opt_binding An optional FileSystemBinding
 *   instance to bind to.  If not provided, a new binding will be created.
 */
export var DomFileSystem = function(file_system, opt_binding) {
  this.binding = opt_binding || new FileSystemBinding();
  this.fileSystem = file_system;

  this.binding.bind(this, {
    stat: this.stat,
    mkdir: this.mkdir_,
    unlink: this.unlink,
    list: this.list,
    createContext: this.createContext
  });

  console.log(this.binding);
  this.binding.ready();
};

export default DomFileSystem;

/**
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {Path} path
 * @return {ResolveResult}
 */
DomFileSystem.prototype.resolve = function(path) {
  // put resolve logic.
  console.log(path);
};

/**
 * @param {string} pathSpec
 * @return {Promise<>}
 */
DomFileSystem.prototype.stat = function(pathSpec) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  var rv = this.resolve(path);

  return rv.entry.stat();
};

/**
 * This version of mkdir_ is attached to the FileSystemBinding to ensure that
 * the JsDirectory returned by `mkdir` doesn't leak through the binding.
 *
 * @param {string} pathSpec
 * @return {Promise<>}
 */
DomFileSystem.prototype.mkdir_ = function(pathSpec) {
  return this.mkdir(pathSpec).then(function() { return null; });
};

/**
 * @param {string} pathSpec
 * @return {Promise<>}
 */
DomFileSystem.prototype.mkdir = function(pathSpec) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  var parentPath = path.getParentPath();
  var targetName = path.getBaseName();


  var rv = this.resolve(parentPath);

  if (!rv.entry.hasMode('d'))
    return Promise.reject(new AxiomError.TypeMismatch('dir', parentPath.spec));

  return rv.entry.mkdir(targetName);
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
 * @param {string} pathSpecFrom
 * @param {string} pathSpecTo
 * @return {Promise<>}
 */
DomFileSystem.prototype.alias = function(pathSpecFrom, pathSpecTo) {
    return Promise.reject(new AxiomError.Invalid('path', 'not supported yet.'));
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
 * @param {string} pathSpecFrom
 * @param {string} pathSpecTo
 * @return {Promise<>}
 */
DomFileSystem.prototype.move = function(fromPathSpec, toPathSpec) {
    return Promise.reject(new AxiomError.Invalid('path', 'not supported yet.'));
};

/**
 * @param {string} pathSpec
 * @return {Promise<>}
 */
DomFileSystem.prototype.unlink = function(pathSpec) {
    return Promise.reject(new AxiomError.Invalid('path', 'not supported yet.'));
};

/**
 * @param {string} pathSpec
 * @return {Promise<>}
 */
DomFileSystem.prototype.list = function(pathSpec) {
    return Promise.reject(new AxiomError.Invalid('path', 'not supported yet.'));
};

/**
 * @param {string} contextType ('execute' | 'open')
 * @param {string} pathSpec
 * @param {Object} arg
 */
DomFileSystem.prototype.createContext = function(contextType, pathSpec, arg) {
  console.log('comes in create context.');
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  var rv = this.resolve(path);
  var cx;

  if (contextType == 'execute') {
    //TODO(grv): implment dom execute context.
    //cx = new DomExecuteContext(this, path, rv.entry, arg);
    console.log('not implemented');
  } else if (contextType == 'open') {
    cx = new DomOpenContext(this, path, rv.entry, arg);
  } else {
    return Promise.reject(new AxiomError.Invalid('contextType', contextType));
  }
  return Promise.resolve(cx.binding);
};
