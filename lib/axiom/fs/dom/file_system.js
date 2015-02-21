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

import DomExecuteContext from 'axiom/fs/dom/execute_context';
import DomOpenContext from 'axiom/fs/dom/open_context';
import JsResolveResult from 'axiom/fs/js/resolve_result';
import domfsUtil from 'axiom/fs/dom/domfs_util';

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
export var DomFileSystem = function(fileSystem) {
  this.fileSystem = fileSystem;

  FileSystem.call(this);
};

export default DomFileSystem;

DomFileSystem.prototype = Object.create(FileSystem.prototype);

DomFileSystem.available = function() {
  return !!(window.requestFileSystem || window.webkitRequestFileSystem);
}

/**
 * Mounts a given type if dom filesystem at /jsDir/mountName
 *
 * @param {string} type temporary or permanent dom filesystem.
 * @param {string} mountName
 * @param {JsDirectory} jsDir
 * @return {Promise<DomFileSystem>}
 */
DomFileSystem.mount = function(type, mountName, jsDir) {
  return new Promise(function(resolve, reject) {
    if (!window.requestFileSystem && !window.webkitRequestFileSystem) {
      return resolve(null);
    }
    var requestFs = (window.requestFileSystem ||
                     window.webkitRequestFileSystem).bind(window);

    // This is currently ignored.
    var capacity = 1024 * 1024 * 1024;

    var onFileSystemFound = function(fs) {
      var domfs = new DomFileSystem(fs);
      jsDir.mount(mountName, domfs);
      resolve(domfs);
    };

    var onFileSystemError = function(e) {
      reject(new AxiomError.Runtime(e));
    };

    if (type == 'temporary') {
      var pemporaryStorage = navigator['webkitTemporaryStorage'];
      pemporaryStorage.requestQuota(capacity, function(bytes) {
          requestFs(window.TEMPORARY, bytes,
                    onFileSystemFound, onFileSystemError);
        });
    } else {
      var persistentStorage = navigator['webkitPersistentStorage'];
      persistentStorage.requestQuota(capacity, function(bytes) {
          requestFs(window.PERSISTENT, bytes,
                    onFileSystemFound, onFileSystemError);
        });
    }
  });
};

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
 * @override
 * @param {string} pathSpec
 * @return {!Promise<!StatResult>}
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
 * @override
 * @param {string} pathSpec
 * @return {!Promise<undefined>}
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
 * @override
 * @param {string} pathSpecFrom
 * @param {string} pathSpecTo
 * @return {!Promise<undefined>}
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
 * @override
 * @param {string} fromPathSpec
 * @param {string} toPathSpec
 * @return {!Promise<undefined>}
 */
DomFileSystem.prototype.move = function(fromPathSpec, toPathSpec) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
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
 * @override
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
 * @override
 * @param {string} pathSpec
 * @param {*} arg
 * @return {!Promise<!ExecuteContext>}
 */
DomFileSystem.prototype.createExecuteContext = function(pathSpec, arg) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));

  /** @type {!ExecuteContext} */
  var cx = new DomExecuteContext(this, path, arg);
  return Promise.resolve(cx);
};

/**
 * @override
 * @param {string} pathSpec
 * @param {string|OpenMode} mode
 * @return {!Promise<!OpenContext>}
 */
DomFileSystem.prototype.createOpenContext = function(pathSpec, mode) {
  var path = new Path(pathSpec);
  if (!path.isValid)
    return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));

  /** @type {!OpenContext} */
  var cx = new DomOpenContext(this, path.spec, mode);
  return Promise.resolve(cx);
};
