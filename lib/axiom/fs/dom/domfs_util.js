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

import Path from 'axiom/fs/path';
import AxiomError from 'axiom/core/error';

export var domfsUtil = {};
export default domfsUtil;

/**
 * @param {Path} path
 * @return {string}
 */
domfsUtil.makeDomfsPath = function(path) {
  if (!path || !path.relSpec)
    return '/';

  return '/' + path.relSpec;
};

/**
 * Get an appropriate 'stat' value for the given HTML5 FileEntry or
 * DirEntry object.
 */
domfsUtil.statEntry = function(entry) {
  return new Promise(function(resolve, reject) {
    var onMetadata = function(entry, metadata) {
      if (!metadata) {
        metadata = {modificationTime: 0, size: 0};
      }
      if (entry.isFile) {
        return resolve({
          dataType: 'blob',
          mode: Path.Mode.R | Path.Mode.W | Path.Mode.K,
          mtime: new Date(metadata.modificationTime).getTime(),
          size: metadata.size
        });
      } else {
        return resolve({
          mode: Path.Mode.R | Path.Mode.D,
          mtime: new Date(metadata.modificationTime).getTime(),
        });
      }
    };

    if ('getMetadata' in entry) {
      entry.getMetadata(
        onMetadata.bind(null, entry),
        function(error) {
          if (error.code === 1001) {
            // NOTE: getMetadata() is not implemented for directories in
            // idb.filesystem.js polyfill: it returns an error with this code.
            onMetadata(entry, null);
          } else {
            reject(error);
          }
        }
      );
    } else {
      reject(new AxiomError.Runtime('entry has no getMetadata'));
    }
  });
 };

/**
 * List all FileEntrys in a given HTML5 directory.
 *
 * @param {DirectoryEntry} root The directory to consider as the root of the
 *     path.
 * @param {string} path The path of the target directory, relative to root.
 * @return {Promise<Object>}
 */
domfsUtil.listDirectory = function(root, path) {
  return new Promise(function(resolve, reject) {
    var entries = {};
    var promises = [];
    var rv = {};
    var addResult = function(entry, statResult) {
      rv[entry.name] = statResult;
    };

    var onFileError = domfsUtil.rejectFileError.bind(null, path, reject);
    var onDirectoryFound = function(dirEntry) {
      var reader = dirEntry.createReader();
      reader.readEntries(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          var promise = domfsUtil.statEntry(entries[i]);
          promises.push(promise.then(addResult.bind(null, entries[i])));
        }

        Promise.all(promises).then(function() {
          return resolve(rv);
        });
      }, onFileError);
    };
    root.getDirectory(path, {create: false}, onDirectoryFound, onFileError);
  });
};

domfsUtil.getFileOrDirectory = function(root, pathSpec) {
  return new Promise(function(resolve, reject) {
    var onFileFound = function(r) {
      return resolve(r);
    };

    var onError = function() {
       var onFileError = domfsUtil.rejectFileError.bind(null, pathSpec, reject);
       root.getDirectory(pathSpec, {create: false}, onFileFound, onFileError);
    };

    root.getFile(pathSpec, {create: false}, onFileFound, onError);
  });
};

/**
 * Removes all files and sub directories for a given path.
 */
domfsUtil.remove = function(root, path) {
  return new Promise(function(resolve, reject) {
    return domfsUtil.getFileOrDirectory(root, path).then(function(r) {
      if (r.isDirectory === false) {
        r.remove(resolve, reject);
      } else {
        r.removeRecursively(resolve, reject);
      }
    }).catch(function(e) {
      return reject(e);
    });
  });
};

/**
 * Create a directory with a given name under root.
 */
domfsUtil.mkdir = function(root, name, exclusive) {
  return new Promise(function(resolve, reject) {
    var onError = domfsUtil.rejectFileError.bind(null, name, reject);
    root.getDirectory(name, {create: true, exclusive: exclusive},
        resolve, onError);
  });
};

/**
 * Convenience method to convert a FileError to a promise rejection with an
 * Axiom error.
 *
 * Used in the context of a FileEntry.
 */
domfsUtil.convertFileError = function(pathSpec, error) {
  if (error.name == 'TypeMismatchError')
    return new AxiomError.TypeMismatch('entry-type', pathSpec);

  if (error.name == 'NotFoundError')
    return new AxiomError.NotFound('path', pathSpec);

  if (error.name == 'PathExistsError')
    return new AxiomError.Duplicate('path', pathSpec);

  return new AxiomError.Runtime(pathSpec + ':' + error.toString());
};

domfsUtil.rejectFileError = function(pathSpec, reject, error) {
  reject(domfsUtil.convertFileError(pathSpec, error));
};
