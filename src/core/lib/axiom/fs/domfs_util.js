// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Path from 'axiom/fs/path';

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
      }, reject);
    };
    root.getDirectory(path, {create: false}, onDirectoryFound, reject);
  });
};

export default domfsUtil;
