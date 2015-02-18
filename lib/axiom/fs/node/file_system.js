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

import ExecuteContext from 'axiom/fs/base/execute_context';
import FileSystem from 'axiom/fs/base/file_system';
import JsDirectory from 'axiom/fs/js/directory';

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
 * TODO(rginda): LocalFileSystem externs for closure.
 * @param {?} fileSystem
 */
export var NodeFileSystem = function(fileSystem) {
  this.fileSystem = fileSystem;

  FileSystem.call(this);
};

export default NodeFileSystem;

NodeFileSystem.prototype = Object.create(FileSystem.prototype);

NodeFileSystem.available = function() {
  return true;
}

/**
 * Mounts a given type if node filesystem at /jsDir/mountName
 *
 * @param {FileSystem} nodefs a node filesystem object.
 * @param {string} mountName
 * @param {JsDirectory} jsDir
 */
NodeFileSystem.mount = function(fs, mountName, jsDir) {
    var nodefs = new NodeFileSystem(fs);
    jsDir.mount(mountName, nodefs);
    return nodefs;
};

/**
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {Path} path
 * @return {Promise<JsResolveResult>}
 */
NodeFileSystem.prototype.resolve = function(path) {
  //TODO(grv): resolve directories and read mode bits.
  var nodefs = this.fileSystem;
  return new Promise(function(resolve, reject) {
    nodefs.root.getFile(path, {create: true}, resolve, reject);
  });
};

/**
 * @override
 * @param {string} pathSpec
 * @return {!Promise<!StatResult>}
 */
NodeFileSystem.prototype.stat = function(pathSpec) {
  return new Promise(function(resolve, reject) {
    var statCb = function(err, stat) {
      resolve(nodefsUtil.filterStat(stat));
    };
    this.fileSystem.stat(pathSpec, statCb);
  }.bind(this));
};

/**
 * This version of mkdir_ is attached to the FileSystemBinding to ensure that
 * the NodeDirectory returned by `mkdir` doesn't leak through the binding.
 *:/m
 * @param {string} pathSpec
 * @return {Promise}
 */
NodeFileSystem.prototype.mkdir_ = function(pathSpec) {
  return this.mkdir(pathSpec).then(function() {
    return null;
  });
};

/**
 * @override
 * @param {string} pathSpec
 * @return {!Promise<undefined>}
 */
NodeFileSystem.prototype.mkdir = function(pathSpec) {

  return new Promise(function(resolve, reject) {
    var cb = function(err, dir) {
      console.log(dir);
      resolve(null);
    };

    this.fileSystem.mkdir([pathSpec], cb);

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
 * @param {string} pathSpecFrom
 * @param {string} pathSpecTo
 * @return {!Promise<undefined>}
 */
NodeFileSystem.prototype.alias = function(pathSpecFrom, pathSpecTo) {
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
 * @param {string} fromPathSpec
 * @param {string} toPathSpec
 * @return {!Promise<undefined>}
 */
NodeFileSystem.prototype.move = function(fromPathSpec, toPathSpec) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
 * @param {string} pathSpec
 * @return {Promise}
 */
NodeFileSystem.prototype.unlink = function(pathSpec) {

  return new Promise(function(resolve, reject) {
    this.fileSystem.unlink(pathSpe, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(null);
      }
    }));

  }.bind(this));
};

/**
 * @override
 * @param {string} pathSpec
 * @return {!Promise<!Object<string, StatResult>>}
 */
NodeFileSystem.prototype.list = function(pathSpec) {
  return nodefsUtil.listDirectory(this.fileSystem, pathSpec).then(
    function(entries) {
      return Promise.resolve(entries);
    });
};

/**
 * @override
 * @param {string} pathSpec
 * @param {*} arg
 * @return {!Promise<!ExecuteContext>}
 */
NodeFileSystem.prototype.createExecuteContext = function(pathSpec, arg) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));

  /** @type {!ExecuteContext} */
  var cx = new NodeExecuteContext(this, path, arg);
  return Promise.resolve(cx);
};

/**
 * @override
 * @param {string} pathSpec
 * @param {string|OpenMode} mode
 * @return {!Promise<!OpenContext>}
 */
NodeFileSystem.prototype.createOpenContext = function(pathSpec, mode) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));

  /** @type {!OpenContext} */
  var cx = new NodeOpenContext(this, path, mode);
  return Promise.resolve(cx);
};
