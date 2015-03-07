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
import FileSystemManager from 'axiom/fs/base/file_system_manager';
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
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} name The file system name
 * TODO(rginda): LocalFileSystem externs for closure.
 * @param {?} fileSystem The html5 file system instance
 * @param {!string} type The html5 file system type
 */
export var DomFileSystem = function(fileSystemManager, name, fileSystem, type) {
  FileSystem.call(this, fileSystemManager, name);

  /** @type {?} */
  this.fileSystem = fileSystem;

  /** @type {string} */
  this.description = 'html5 file system (' + type + ')';
};

export default DomFileSystem;

DomFileSystem.prototype = Object.create(FileSystem.prototype);

DomFileSystem.available = function() {
  return !!(window.requestFileSystem || window.webkitRequestFileSystem);
}

/**
 * Mounts a given type if dom filesystem at /jsDir/mountName
 *
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} fileSystemName
 * @param {!string} type  File system type: 'temporary' or 'permanent'.
 * @return {Promise<DomFileSystem!>}
 */
DomFileSystem.mount = function(fileSystemManager, fileSystemName, type) {
  return new Promise(function(resolve, reject) {
    if (!window.requestFileSystem && !window.webkitRequestFileSystem) {
      return resolve(null);
    }
    var requestFs = (window.requestFileSystem ||
                     window.webkitRequestFileSystem).bind(window);

    // This is currently ignored.
    var capacity = 1024 * 1024 * 1024;

    var onFileSystemFound = function(fs) {
      var domfs =
          new DomFileSystem(fileSystemManager, fileSystemName, fs, type);
      fileSystemManager.mount(domfs);
      return resolve(domfs);
    };

    var onFileSystemError = function(e) {
      reject(new AxiomError.Runtime(e));
    };

    if (type == 'temporary') {
      var temporaryStorage = navigator['webkitTemporaryStorage'];
      temporaryStorage.requestQuota(capacity, function(bytes) {
          requestFs(window.TEMPORARY, bytes,
                    onFileSystemFound, onFileSystemError);
        }, onFileSystemError);
    } else {
      var persistentStorage = navigator['webkitPersistentStorage'];
      persistentStorage.requestQuota(capacity, function(bytes) {
        requestFs(window.PERSISTENT, bytes,
                    onFileSystemFound, onFileSystemError);
        }, onFileSystemError);
    }
  });
};

/**
 * @private
 * @param {Path} path
 * @return {!boolean}
 */
DomFileSystem.prototype.isValidPath_ = function(path) {
  return !(!path || !path.isValid || path.root !== this.name);
}

/**
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {Path} path
 * @return {Promise<JsResolveResult>}
 */
DomFileSystem.prototype.resolve = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  //TODO(grv): resolve directories and read mode bits.
  var domfs = this.fileSystem;
  return new Promise(function(resolve, reject) {
    domfs.root.getFile(domfsUtil.makeDomfsPath(path), {create: true},
        resolve, reject);
  });
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!StatResult>}
 */
DomFileSystem.prototype.stat = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return domfsUtil.getFileOrDirectory(this.fileSystem.root, 
      domfsUtil.makeDomfsPath(path)).then(function(r) {
    return domfsUtil.statEntry(r);
  });
};

/**
 * This version of mkdir_ is attached to the FileSystemBinding to ensure that
 * the DomDirectory returned by `mkdir` doesn't leak through the binding.
 *
 * @param {Path} path
 * @return {Promise}
 */
DomFileSystem.prototype.mkdir_ = function(path) {
  return this.mkdir(path).then(function() {
    return null;
  });
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<undefined>}
 */
DomFileSystem.prototype.mkdir = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return new Promise(function(resolve, reject) {
    var parentPath = path.getParentPath();
    var targetName = path.getBaseName();

    var onDirectoryFound = function(dir) {
      return domfsUtil.mkdir(dir, targetName).then(function(r) {
        return resolve(r);
      }).catch (function(e) {
        return reject(e);
      });
    };

    var onFileError =
        domfsUtil.rejectFileError.bind(null, path.relSpec, reject);

    this.fileSystem.root.getDirectory(domfsUtil.makeDomfsPath(parentPath),
        {create: false}, onDirectoryFound, onFileError);
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
DomFileSystem.prototype.alias = function(pathFrom, pathTo) {
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
 * @param {Path} fromPath
 * @param {Path} toPath
 * @return {!Promise<undefined>}
 */
DomFileSystem.prototype.move = function(fromPath, toPath) {
  return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
};

/**
 * @override
 * @param {Path} path
 * @return {Promise}
 */
DomFileSystem.prototype.unlink = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return new Promise(function(resolve, reject) {
    var parentPath = path.getParentPath();
    var targetName = path.getBaseName();

    var onDirectoryFound = function(dir) {
      return domfsUtil.remove(dir, targetName).then(function(r) {
        return resolve(r);
      }).catch (function(e) {
        return reject(e);
      });
    };

    var onFileError =
        domfsUtil.rejectFileError.bind(null, path.relSpec, reject);

    this.fileSystem.root.getDirectory(domfsUtil.makeDomfsPath(parentPath),
        {create: false}, onDirectoryFound, onFileError);
  }.bind(this));
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!Object<string, StatResult>>}
 */
DomFileSystem.prototype.list = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return domfsUtil.listDirectory(this.fileSystem.root,
      domfsUtil.makeDomfsPath(path)).then(function(entries) {
    return Promise.resolve(entries);
  });
};

/**
 * @override
 * @param {!Path} path
 * @param {Object} arg
 * @return {!Promise<!ExecuteContext>}
 */
DomFileSystem.prototype.createExecuteContext = function(path, arg) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  /** @type {!ExecuteContext} */
  var cx = new DomExecuteContext(this, path, arg);
  return Promise.resolve(cx);
};

/**
 * @override
 * @param {Path} path
 * @param {string|OpenMode} mode
 * @return {!Promise<!OpenContext>}
 */
DomFileSystem.prototype.createOpenContext = function(path, mode) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  /** @type {!OpenContext} */
  var cx = new DomOpenContext(this, path, mode);
  return Promise.resolve(cx);
};

/**
 * Installs an object of callback executables into /exe.
 *
 * @override
 * @param {Object<string, function(JsExecuteContext)>} executables
 * @return {void}
 */
DomFileSystem.prototype.install = function(obj) {
  throw(new AxiomError.NotImplemented('To be implemented.'));
}
