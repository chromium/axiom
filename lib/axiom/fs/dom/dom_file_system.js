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

import FileSystem from 'axiom/bindings/fs/file_system';

import Path from 'axiom/fs/path';
import DomExecuteContext from 'axiom/fs/dom_execute_context';
import DomOpenContext from 'axiom/fs/dom_open_context';
import domfsUtil from 'axiom/fs/domfs_util';

/** @typedef ExecuteContext$$module$axiom$bindings$fs$execute_context */
var ExecuteContext;

/** @typedef JsResolveResult$$module$axiom$fs$js_resolve_result */
var JsResolveResult;

/** @typedef OpenContext$$module$axiom$bindings$fs$open_context */
var OpenContext;

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/**
 * @constructor
 * TODO(rginda): LocalFileSystem externs for closure.
 * @param {?} fileSystem
 * @param {FileSystem=} opt_binding An optional FileSystem
 * instance to bind to. If not provided, a new binding will be created.
 */
var DomFileSystem = function(fileSystem, opt_binding) {
  this.binding = opt_binding || new FileSystem();
  this.fileSystem = fileSystem;

  this.binding.bind(this, {
    stat: this.stat,
    mkdir: this.mkdir_,
    unlink: this.unlink,
    list: this.list,
    createExecuteContext: this.createExecuteContext,
    createOpenContext: this.createOpenContext
  });

  this.binding.ready();
};

export {DomFileSystem};
export default DomFileSystem;

/**
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {Path} path
 * @return {Promise<JsResolveResult>}
 */
DomFileSystem.prototype.resolve = function(path) {
  //TODO(grv): resolve directories and read mode bits.
  var domfs = this.fileSystem;
  return new Promise(function(resolve, reject) {
    domfs.root.getFile(path, {create: true}, resolve, reject);
  });
};

/**
 * @param {string} pathSpec
 * @return {Promise}
 */
DomFileSystem.prototype.stat = function(pathSpec) {
  return domfsUtil.getFileOrDirectory(this.fileSystem.root, pathSpec).then(
      function(r) {
    return domfsUtil.statEntry(r);
  });
};

/**
 * This version of mkdir_ is attached to the FileSystemBinding to ensure that
 * the DomDirectory returned by `mkdir` doesn't leak through the binding.
 *
 * @param {string} pathSpec
 * @return {Promise}
 */
DomFileSystem.prototype.mkdir_ = function(pathSpec) {
  return this.mkdir(pathSpec).then(function() {
    return null;
  });
};

/**
 * @param {string} pathSpec
 * @return {Promise}
 */
DomFileSystem.prototype.mkdir = function(pathSpec) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));

  return new Promise(function(resolve, reject) {
    var parentPath = path.getParentPath();
    var targetName = path.getBaseName();

    var onDirectoryFound = function(dir) {
      return domfsUtil.mkdir(dir, targetName).then(function(r) {
        resolve(r);
      }).catch (function(e) {
        reject(e);
      });
    };

    var onFileError = domfsUtil.rejectFileError.bind(null, pathSpec, reject);

    var parentPathSpec = parentPath.spec;

    //TODO(grv): This should be taken care by Path class.
    if (parentPathSpec === '' || parentPathSpec == null) {
      parentPathSpec = '/';
    }

    this.fileSystem.root.getDirectory(parentPath.spec, {create: false},
        onDirectoryFound, onFileError);
  }.bind(this));
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
 * @return {Promise}
 */
DomFileSystem.prototype.alias = function(pathSpecFrom, pathSpecTo) {
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
 * @param {string} fromPathSpec
 * @param {string} toPathSpec
 * @return {Promise}
 */
DomFileSystem.prototype.move = function(fromPathSpec, toPathSpec) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @param {string} pathSpec
 * @return {Promise}
 */
DomFileSystem.prototype.unlink = function(pathSpec) {
  var path = new Path(pathSpec);
  if (!path.isValid) {
    return Promise.reject(new AxiomError.Invalid('path', pathSpec));
  }

  return new Promise(function(resolve, reject) {
    var parentPath = path.getParentPath();
    var targetName = path.getBaseName();

    var onDirectoryFound = function(dir) {
      return domfsUtil.remove(dir, targetName).then(function(r) {
        resolve(r);
      }).catch (function(e) {
        reject(e);
      });
    };

    var onFileError = domfsUtil.rejectFileError.bind(null, pathSpec, reject);

    var parentPathSpec = parentPath.spec;

    //TODO(grv): This should be taken care by Path class.
    if (parentPathSpec === '' || parentPathSpec == null) {
      parentPathSpec = '/';
    }

    this.fileSystem.root.getDirectory(parentPath.spec, {create: false},
        onDirectoryFound, onFileError);
  }.bind(this));
};

/**
 * @param {string} pathSpec
 * @return {!Promise<!Object<string, StatResult>>}
 */
DomFileSystem.prototype.list = function(pathSpec) {
  return domfsUtil.listDirectory(this.fileSystem.root, pathSpec).then(
    function(entries) {
      return Promise.resolve(entries);
    });
};

/**
 * @param {string} pathSpec
 * @param {Object} arg
 * @return {!Promise<!ExecuteContext>}
 */
DomFileSystem.prototype.createExecuteContext = function(pathSpec, arg) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));

  var cx = new DomExecuteContext(this, path, arg);
  return Promise.resolve(cx.binding);
};

/**
 * @param {string} pathSpec
 * @param {Object} arg
 * @return {!Promise<!OpenContext>}
 */
DomFileSystem.prototype.createOpenContext = function(pathSpec, arg) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));

  var cx = new DomOpenContext(this, path, arg);
  return Promise.resolve(cx.binding);
};
