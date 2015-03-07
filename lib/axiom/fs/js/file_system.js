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

import Arguments from 'axiom/fs/arguments';
import Path from 'axiom/fs/path';
import StatResult from 'axiom/fs/stat_result';

import FileSystem from 'axiom/fs/base/file_system';
import FileSystemManager from 'axiom/fs/base/file_system_manager';
import ExecuteContext from 'axiom/fs/base/execute_context';
import OpenMode from 'axiom/fs/open_mode';

import JsDirectory from 'axiom/fs/js/directory';
import JsExecutable from 'axiom/fs/js/executable';
import JsExecuteContext from 'axiom/fs/js/execute_context';
import JsOpenContext from 'axiom/fs/js/open_context';
import JsResolveResult from 'axiom/fs/js/resolve_result';
import JsValue from 'axiom/fs/js/value';

/** @typedef {OpenContext$$module$axiom$fs$base$open_context} */
var OpenContext;

/**
 * @constructor @extends {FileSystem}
 * @param {FileSystemManager=} opt_fileSystemManager  A optional file system
 *    manager. A default one is created is not specified.
 * @param {string=} opt_name An optional file system name ('jsfs' by default).
 * @param {JsDirectory=} opt_rootDirectory An optional directory instance
 *   to use as the root.
 */
export var JsFileSystem =
    function(opt_fileSystemManager, opt_name, opt_rootDirectory) {
  var fileSystemManager = opt_fileSystemManager || new FileSystemManager();
  var name = opt_name || 'jsfs';
  FileSystem.call(this, fileSystemManager, name);

  /** @type {JsDirectory} */
  this.rootDirectory = opt_rootDirectory || new JsDirectory(this);

  /** @type {string} */
  this.description = 'js file system';

  if (!opt_fileSystemManager) {
    fileSystemManager.mount(this);
  }
};

export default JsFileSystem;

JsFileSystem.prototype = Object.create(FileSystem.prototype);

/**
 * @private
 * @param {Path} path
 * @return {!boolean}
 */
JsFileSystem.prototype.isValidPath_ = function(path) {
  return !(!path || !path.isValid || path.root !== this.name);
}

/**
 * Resolve a path to a specific kind of JsEntry or reference to BaseFileSystem,
 * if possible.  See JsResolveResult for more information.
 *
 * @param {Path} path
 * @return {JsResolveResult}
 */
JsFileSystem.prototype.resolve = function(path) {
  if (!path.elements.length)
    return new JsResolveResult(null, null, this.rootDirectory);

  return this.rootDirectory.resolve(path, 0);
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!StatResult>}
 */
JsFileSystem.prototype.stat = function(path) {
  if (!path)
    return this.rootDirectory.stat();

  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  var rv = this.resolve(path);
  if (rv.entry instanceof FileSystem)
    return rv.entry.stat(rv.entry.rootPath.combine(Path.join(rv.suffixList)));

  if (!rv.isFinal) {
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  return rv.entry.stat();
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<undefined>}
 */
JsFileSystem.prototype.mkdir = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  var parentPath = path.getParentPath();
  var targetName = path.getBaseName();

  var rv = this.resolve(parentPath);

  if (rv.entry instanceof FileSystem) {
    return rv.entry.mkdir(
        rv.entry.rootPath.combine(Path.join(rv.suffixList, targetName)));
  }

  if (!rv.isFinal) {
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  if (!rv.entry.hasMode('D'))
    return Promise.reject(new AxiomError.TypeMismatch('dir', parentPath.spec));

  return rv.entry.mkdir(targetName).then(function(jsdir) { return null; });
};

/**
 * @override
 * @param {Path} pathFrom
 * @param {Path} pathTo
 * @return {!Promise<undefined>}
 */
JsFileSystem.prototype.alias = function(pathFrom, pathTo) {
  if (!this.isValidPath_(pathFrom)) {
    return Promise.reject(
      new AxiomError.Invalid('pathFrom', pathFrom.originalSpec));
  }
  var resolveFrom = this.resolve(pathFrom);

  if (!this.isValidPath_(pathTo)) {
    return Promise.reject(
      new AxiomError.Invalid('pathTo', pathTo.originalSpec));
  }
  var resolveTo = this.resolve(pathTo);

  if (!resolveFrom.isFinal) {
    if (resolveFrom.entry instanceof FileSystem) {
      // If the source resolution stopped on a file system, then the target
      // must stop on the same file system.  If not, this is an attempt to move
      // across file systems.
      if (resolveTo.entry == resolveFrom.entry) {
        return resolveFrom.entry.move(
            resolveFrom.entry.rootPath.combine(Path.join(
                resolveFrom.suffixList)),
            resolveFrom.entry.rootPath.combine(Path.join(
                resolveTo.suffixList)));
      }

      return Promise.reject(
        new AxiomError.Invalid('filesystem', pathFrom.originalSpec));
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
  if (resolveTo.entry instanceof FileSystem) {
    return Promise.reject(
      new AxiomError.Invalid('filesystem', pathTo.originalSpec));
  }

  if (resolveTo.isFinal) {
    // If target path resolution makes it to the end and finds something other
    // than a directory, that's trouble.
    if (!(resolveTo.entry instanceof JsDirectory)) {
      return Promise.reject(
        new AxiomError.Duplicate('pathTo', pathTo.originalSpec));
    }

    // But if path resolution stops on a directory, that just means we should
    // take the target name from the source.
    targetName = pathFrom.getBaseName();

  } else if (resolveTo.suffixList.length == 1) {
    // If the resolution was not final then there should be a single name in
    // the suffix list, which we'll use as the target name.
    targetName = pathFrom.getBaseName();

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
 * @override
 * @param {Path} fromPath
 * @param {Path} toPath
 * @return {!Promise<undefined>}
 */
JsFileSystem.prototype.move = function(fromPath, toPath) {
  return this.alias(fromPath, toPath).then(
    function() {
      return this.unlink(fromPath);
    });
};

/**
 * @override
 * @param {Path} path
 * @return {Promise}
 */
JsFileSystem.prototype.unlink = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  var parentPath = path.getParentPath();
  var targetName = path.getBaseName();

  var rv = this.resolve(parentPath);
  if (rv.entry instanceof FileSystem) {
    return rv.entry.unlink(
        rv.entry.rootPath.combine(Path.join(rv.suffixList, targetName)));
  }

  if (!rv.isFinal) {
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  if (rv.entry instanceof JsDirectory)
    return rv.entry.unlink(targetName);

  return Promise.reject(new AxiomError.TypeMismatch('dir', parentPath.spec));
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!Object<string, StatResult>>}
 */
JsFileSystem.prototype.list = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  var rv = this.resolve(path);
  if (rv.entry instanceof FileSystem) {
    return rv.entry.list(
        rv.entry.rootPath.combine(Path.join(rv.suffixList)));
  }

  if (!rv.isFinal) {
    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  if (!(rv.entry instanceof JsDirectory)) {
    return Promise.reject(
      new AxiomError.TypeMismatch('dir', path.originalSpec));
  }

  return rv.entry.list();
};

/**
 * @override
 * @param {!Path} exePath  Path object pointing to the target executable.
 * @param {Object} argDict  Arguments as a plain JS object.
 * @return {!Promise<!ExecuteContext>}
 */
JsFileSystem.prototype.createExecuteContext = function(exePath, argDict) {
  if (!this.isValidPath_(exePath))
    return Promise.reject(new AxiomError.Invalid('path', exePath.originalSpec));

  var rv = this.resolve(exePath);
  if (!rv.isFinal) {
    if (rv.entry instanceof FileSystem) {
      return rv.entry.createExecuteContext(
          rv.entry.rootPath.combine(Path.join(rv.suffixList)), argDict);
    }

    return Promise.reject(new AxiomError.NotFound(
        'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
  }

  if (rv.entry instanceof JsExecutable) {
    var args;
    try {
      args = new Arguments(rv.entry.signature, argDict);
    } catch (ex) {
      return Promise.reject(ex);
    }

    /** @type {!ExecuteContext} */
    var cx = new JsExecuteContext(this, exePath, rv.entry, args);
    return Promise.resolve(cx);
  }

  return Promise.reject(
    new AxiomError.TypeMismatch('executable', exePath.originalSpec));
};

/**
 * @override
 * @param {Path} path
 * @param {string|OpenMode} mode
 * @return {!Promise<!OpenContext>}
 */
JsFileSystem.prototype.createOpenContext = function(path, mode) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  if (typeof mode == 'string')
    mode = OpenMode.fromString(mode);

  var rv = this.resolve(path);
  if (!rv.isFinal) {
    if (rv.entry instanceof FileSystem) {
      return rv.entry.createOpenContext(
          rv.entry.rootPath.combine(Path.join(rv.suffixList)), mode);
    } else if ((rv.entry instanceof JsDirectory) &&  mode.create &&
        (rv.suffixList.length == 1)) {
      // Create empty file if "create" mode
      var name = rv.suffixList[0];
      var value = new JsValue(this, 'RWK');
      rv.entry.link(name, value);
      rv.entry = value;
    } else {
      return Promise.reject(new AxiomError.NotFound(
          'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
    }
  }

  if (rv.entry instanceof JsValue) {
    // Truncate file (if previously existing)
    if (mode.write && mode.truncate) {
      rv.entry.value = null;
    }

    /** @type {!OpenContext} */
    var cx = new JsOpenContext(this, path, rv.entry, mode);
    return Promise.resolve(cx);
  }

  return Promise.reject(
    new AxiomError.TypeMismatch('openable', path.originalSpec));
};

/**
 * Installs a list of executables represented by an object into /exe.
 *
 * @override
 * @param {Object<string, function(JsExecuteContext)>} executables
 * @return {void}
 */
JsFileSystem.prototype.install = function(obj) {
  var exeDirName = 'exe';
  var exePath = this.getPath(exeDirName);

  var result = this.rootDirectory.resolve(exePath);

  if (!result.isFinal)
    throw new AxiomError.Missing('path ' + exePath.spec);

  result.entry.install(obj);
}
