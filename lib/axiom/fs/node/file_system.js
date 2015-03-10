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
import ReadResult from 'axiom/fs/read_result';
import DataType from 'axiom/fs/data_type';

import ExecuteContext from 'axiom/fs/base/execute_context';
import FileSystem from 'axiom/fs/base/file_system';
import FileSystemManager from 'axiom/fs/base/file_system_manager';

import NodeExecuteContext from 'axiom/fs/node/execute_context';
import NodeOpenContext from 'axiom/fs/node/open_context';
import JsResolveResult from 'axiom/fs/js/resolve_result';
import nodefsUtil from 'axiom/fs/node/nodefs_util';

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
 * TODO(rginda): LocalFileSystem externs for closure.
 * @param {?} nodefs The local node file system
 */
export var NodeFileSystem = function(fileSystemManager, name, nodefs) {
  FileSystem.call(this, fileSystemManager, name);

  /** @type {?} */
  this.nodefs = nodefs;

  /** @type {string} */
  this.description = 'node file system';
};

export default NodeFileSystem;

NodeFileSystem.prototype = Object.create(FileSystem.prototype);

NodeFileSystem.available = function() {
  return true;
}

/**
 * @private
 * @param {Path} path
 * @return {string}
 */
NodeFileSystem.makeNodefsPath_ = function(path) {
  if (!path || !path.relSpec)
    return '/';

  return '/' + path.relSpec;
}

/**
 * @private
 * @param {Path} path
 * @return {!boolean}
 */
NodeFileSystem.prototype.isValidPath_ = function(path) {
  return !(!path || !path.isValid || path.root !== this.name);
}

/**
 * Mounts a given type if node filesystem at /jsDir/mountName
 *
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} fileSystemName
 * @param {?} nodefs a node filesystem object.
 * @return {!NodeFileSystem}
 */
NodeFileSystem.mount = function(fileSystemManager, fileSystemName, nodefs) {
  var fileSystem =
      new NodeFileSystem(fileSystemManager, fileSystemName, nodefs);
  fileSystemManager.mount(fileSystem);
  return fileSystem;
};

/**
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {Path} path
 * @return {Promise<JsResolveResult>}
 */
NodeFileSystem.prototype.resolve = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  //TODO(grv): resolve directories and read mode bits.
  var nodefs = this.nodefs;
  return new Promise(function(resolve, reject) {
    nodefs.root.getFile(NodeFileSystem.makeNodefsPath_(path), 
        {create: true}, resolve, reject);
  });
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!StatResult>}
 */
NodeFileSystem.prototype.stat = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return new Promise(function(resolve, reject) {
    var statCb = function(err, stat) {
      if (err) {
        return reject(err);
      }
      return resolve(nodefsUtil.filterStat(stat));
    };
    this.nodefs.stat(NodeFileSystem.makeNodefsPath_(path), statCb);
  }.bind(this));
};

/**
 * This version of mkdir_ is attached to the FileSystemBinding to ensure that
 * the NodeDirectory returned by `mkdir` doesn't leak through the binding.
 *:/m
 * @param {Path} path
 * @return {Promise}
 */
NodeFileSystem.prototype.mkdir_ = function(path) {
  return this.mkdir(path).then(function() {
    return null;
  });
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<undefined>}
 */
NodeFileSystem.prototype.mkdir = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return new Promise(function(resolve, reject) {
    var cb = function(err) {
      if (err) {
        return reject(err)
      } else {
        return resolve(null);
      }
    };

    this.nodefs.mkdir(NodeFileSystem.makeNodefsPath_(path), cb);
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
 * @override
 * @param {Path} pathFrom
 * @param {Path} pathTo
 * @return {!Promise<undefined>}
 */
NodeFileSystem.prototype.alias = function(pathFrom, pathTo) {
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
 * @param {Path} fromSpec
 * @param {Path} toSpec
 * @return {!Promise<undefined>}
 */
NodeFileSystem.prototype.move = function(fromSpec, toSpec) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
 * @param {Path} path
 * @return {Promise}
 */
NodeFileSystem.prototype.unlink = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return new Promise(function(resolve, reject) {
    this.nodefs.unlink(NodeFileSystem.makeNodefsPath_(path), function(err) {
      if (err) {
        return reject(err);
      } else {
        return resolve(null);
      }
    });
  }.bind(this));
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!Object<string, StatResult>>}
 */
NodeFileSystem.prototype.list = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return nodefsUtil.listDirectory(
      this.nodefs, NodeFileSystem.makeNodefsPath_(path)).then(
    function(entries) {
      return Promise.resolve(entries);
    });
};

/**
 * @override
 * @param {!Path} path
 * @param {Object} argDict
 * @return {!Promise<!ExecuteContext>}
 */
NodeFileSystem.prototype.createExecuteContext = function(path, argDict) {
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  /** @type {!ExecuteContext} */
  var cx = new NodeExecuteContext(this, path, argDict);
  return Promise.resolve(cx);
};

/**
 * @override
 * @param {Path} path
 * @param {string|OpenMode} mode
 * @return {!Promise<!OpenContext>}
 */
NodeFileSystem.prototype.createOpenContext = function(path, mode) {
  if (!path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  /** @type {!OpenContext} */
  var cx = new NodeOpenContext(this, path, mode);
  return Promise.resolve(cx);
};

/**
 * Installs an object of callback executables into /exe.
 *
 * @override
 * @param {Object<string, function(JsExecuteContext)>} executables
 * @return {void}
 */
NodeFileSystem.prototype.install = function(obj) {
  throw(new AxiomError.NotImplemented('To be implemented.'));
}