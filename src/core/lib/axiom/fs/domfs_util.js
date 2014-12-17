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

/**
 * Get an appropriate 'stat' value for the given HTML5 FileEntry or
 * DirEntry object.
 */
domfsUtil.statEntry = function(entry) {
  return new Promise(function(resolve, reject) {
     var onMetadata = function(entry, metadata) {
       if (entry.isFile) {
         resolve({
           dataType: 'blob',
           mode: Path.mode.r | Path.mode.w | Path.mode.k,
           mtime: new Date(metadata.modificationTime).getTime(),
           size: metadata.size
         });
       } else {
         resolve({
           mode: Path.mode.r | Path.mode.d,
           mtime: new Date(metadata.modificationTime).getTime(),
         });
       }
     };

     if ('getMetadata' in entry) {
       entry.getMetadata(onMetadata.bind(null, entry), reject);
     } else {
       resolve({abilities: [], source: 'domfs'});
     }
   });
 };

/**
 * List all FileEntrys in a given HTML5 directory.
 *
 * @param {DirectoryEntry} root The directory to consider as the root of the
 *     path.
 * @param {string} path The path of the target directory, relative to root.
 */
domfsUtil.listDirectory = function(root, path, onSuccess, opt_onError) {
  return new Promise(function(resolve, reject) {
    var entries = {};
    var promises = [];
    var rv = {};

var onFileError = domfsUtil.rejectFileError.bind(null, path, reject);
    var onDirectoryFound = function(dirEntry) {
      var reader = dirEntry.createReader();
      reader.readEntries(function(results) {
        for (var i = 0; i < results.length; i++) {
          var promise = domfsUtil.statEntry(results[i]);
          promises.push(promise.then(function(i, statResult) {
            rv[results[i].name] = statResult;
          }.bind(null, i)));
        }

        Promise.all(promises).then(function() {
          resolve(rv);
        });
      }, onFileError);
    };
    root.getDirectory(path, {create: false}, onDirectoryFound, onFileError);
  });
};

domfsUtil.getFileOrDirectory = function(root, pathSpec) {
  return new Promise(function(resolve, reject) {
    var onFileFound = function(r) {
      resolve(r);
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
      reject(e);
    });
  });
};

/**
 * Create a directory with a given name under root.
 */
domfsUtil.mkdir = function(root, name) {
  return new Promise(function(resolve, reject) {
    var onError = domfsUtil.rejectFileError.bind(null, name, reject);
    root.getDirectory(name, {create: true, exclusive: true}, resolve, onError);
  });
};

/**
 * Convenience method to convert a FileError to a promise rejection with an
 * Axiom error.
 *
 * Used in the context of a FileEntry.
 */
domfsUtil.rejectFileError = function(pathSpec, reject, error) {
  if (error.name == 'TypeMismatchError')
    return reject(new AxiomError.TypeMismatch('entry-type', pathSpec));

  if (error.name == 'NotFoundError')
    return reject(new AxiomError.NotFound('path', pathSpec));

  if (error.name == 'PathExistsError')
    return reject(new AxiomError.Duplicate('path', pathSpec));

  return new AxiomError.Runtime(pathSpec + ':' + error.toString());
};

export default domfsUtil;
