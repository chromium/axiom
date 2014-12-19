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

import FileSystemBinding from 'axiom/bindings/fs/file_system';

import Path from 'axiom/fs/path';
import JsDirectory from 'axiom/fs/js_directory';
import JsExecuteContext from 'axiom/fs/js_execute_context';
import JsOpenContext from 'axiom/fs/js_open_context';
import JsResolveResult from 'axiom/fs/js_resolve_result';

/**
 * @param {JsDirectory} opt_rootDirectory An optional directory instance
 *   to use as the root.
 * @param {FileSystemBinding} opt_binding An optional FileSystemBinding
 *   instance to bind to.  If not provided, a new binding will be created.
 */
export var JsFileSystem = function(opt_rootDirectory, opt_binding) {
  this.binding = opt_binding || new FileSystemBinding();
  this.rootDirectory = opt_rootDirectory || new JsDirectory(this);

  this.binding.bind(this, {
    stat: this.stat,
    mkdir: this.mkdir_,
    unlink: this.unlink,
    list: this.list,
    createContext: this.createContext
  });

  this.binding.ready();
};

export default JsFileSystem;

/**
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {Path} path
 * @return {ResolveResult}
 */
JsFileSystem.prototype.resolve = function(path) {
  if (!path.elements.length)
    return new JsResolveResult(null, null, this.rootDirectory);

  return this.rootDirectory.resolve(path, 0);
};

/**
 * @param {string} pathSpec
 * @return {Promise<>}
 */
JsFileSystem.prototype.stat = function(pathSpec) {
  if (!pathSpec)
    return this.rootDirectory.stat();

  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  var rv = this.resolve(path);
  if (rv.entry instanceof FileSystemBinding)
    return rv.entry.stat(Path.join(rv.suffixList));

  if (!rv.isFinal) {
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  return rv.entry.stat();
};

/**
 * This version of mkdir_ is attached to the FileSystemBinding to ensure that
 * the JsDirectory returned by `mkdir` doesn't leak through the binding.
 *
 * @param {string} pathSpec
 * @return {Promise<>}
 */
JsFileSystem.prototype.mkdir_ = function(pathSpec) {
  return this.mkdir(pathSpec).then(function() { return null; });
};

/**
 * @param {string} pathSpec
 * @return {Promise<>}
 */
JsFileSystem.prototype.mkdir = function(pathSpec) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  var parentPath = path.getParentPath();
  var targetName = path.getBaseName();


  var rv = this.resolve(parentPath);

  if (rv.entry instanceof FileSystemBinding)
    return rv.entry.mkdir(Path.join(rv.suffixList, targetName));

  if (!rv.isFinal) {
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

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
JsFileSystem.prototype.alias = function(pathSpecFrom, pathSpecTo) {
  var pathFrom = new Path(pathSpecFrom);
  if (!pathFrom.isValid)
    return Promise.reject(new AxiomError.Invalid('pathSpecFrom', pathSpecFrom));
  var resolveFrom = this.resolve(pathFrom);

  var pathTo = new Path(pathSpecTo);
  if (!pathTo.isValid)
    return Promise.reject(new AxiomError.Invalid('pathSpecTo', pathSpecTo));
  var resolveTo = this.resolve(pathTo);

  if (!resolveFrom.isFinal) {
    if (resolveFrom.entry instanceof FileSystemBinding) {
      // If the source resolution stopped on a file system, then the target
      // must stop on the same file system.  If not, this is an attempt to move
      // across file systems.
      if (resolveTo.entry == resolveFrom.entry) {
        return resolveFrom.entry.move(
            Path.join(resolveFrom.suffixList),
            Path.join(resolveTo.suffixList));
      }

      return Promise.reject(new AxiomError.Invalid('filesystem', pathSpecFrom));
    }

    // Otherwise, if the source resolve was not final then the source path
    // doesn't exist.
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(resolveTo.prefixList.join('/'),
                          resolveTo.suffixList[0])));
  }

  var targetName;

  // If the target path resolution stops (finally, or otherwise) on a
  // filesystem, that's trouble.
  if (resolveTo.entry instanceof FileSystemBinding)
    return Promise.reject(new AxiomError.Invalid('filesystem', pathSpecTo));

  if (resolveTo.isFinal) {
    // If target path resolution makes it to the end and finds something other
    // than a directory, that's trouble.
    if (resolveTo.entry.hasMode('d'))
      return Promise.reject(new AxiomError.Duplicate('pathSpecTo', pathSpecTo));

    // But if path resolution stops on a directory, that just means we should
    // take the target name from the source.
    targetName = resolveFrom.getBaseName();

  } else if (resolveTo.suffixList.length == 1) {
    // If the resolution was not final then there should be a single name in
    // the suffix list, which we'll use as the target name.
    targetName = resolveFrom.getBaseName();

  } else {
    // If there's more than one item in the suffix list then the path refers
    // to non-existent directories.
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(resolveFrom.prefixList.join('/'),
                          resolveFrom.suffixList[0])));
  }

  // Link first, then unlink.  Failure mode is two copies of the file rather
  // than zero.
  return resolveTo.entry.link(targetName, resolveFrom.entry);
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
JsFileSystem.prototype.move = function(fromPathSpec, toPathSpec) {
  return this.alias(fromPathSpec, toPathSpec).then(
    function() {
      return this.unlink(fromPathSpec);
    });
};

/**
 * @param {string} pathSpec
 * @return {Promise<>}
 */
JsFileSystem.prototype.unlink = function(pathSpec) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  var parentPath = path.getParentPath();
  var targetName = path.getBaseName();

  var rv = this.resolve(parentPath);
  if (rv.entry instanceof FileSystemBinding)
    return rv.entry.unlink(Path.join(rv.suffixList, targetName));

  if (!rv.isFinal) {
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  if (!rv.entry.hasMode('d'))
    return Promise.reject(new AxiomError.TypeMismatch('dir', parentPath.spec));

  return rv.entry.unlink(targetName);
};

/**
 * @param {string} pathSpec
 * @return {Promise<>}
 */
JsFileSystem.prototype.list = function(pathSpec) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  var rv = this.resolve(path);
  if (rv.entry instanceof FileSystemBinding)
    return rv.entry.list(Path.join(rv.suffixList));

  if (!rv.isFinal) {
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  if (!rv.entry.hasMode('d'))
    return Promise.reject(new AxiomError.TypeMismatch('dir', pathSpec));

  return rv.entry.list();
};

/**
 * @param {string} contextType ('execute' | 'open')
 * @param {string} pathSpec
 * @param {Object} arg
 */
JsFileSystem.prototype.createContext = function(contextType, pathSpec, arg) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  var rv = this.resolve(path);
  if (!rv.isFinal) {
    if (rv.entry instanceof FileSystemBinding)
      return rv.entry.createContext(contextType, Path.join(rv.suffixList), arg);

    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  var cx;

  if (contextType == 'execute') {
    cx = new JsExecuteContext(this, path, rv.entry, arg);
  } else if (contextType == 'open') {
    cx = new JsOpenContext(this, path, rv.entry, arg);
  } else {
    return Promise.reject(new AxiomError.Invalid('contextType', contextType));
  }

  return Promise.resolve(cx.binding);
};
