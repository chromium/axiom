// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export var DomfsUtil = {};

/**
 * Get an appropriate 'stat' value for the given HTML5 FileEntry or
 * DirEntry object.
 */
DomfsUtil.statEntry = function(entry, onSuccess, onError) {
  return new Promise(function(resolve, reject) {
     var onMetadata = function(entry, metadata) {
       if (entry.isFile) {
         resolve({
           source: 'domfs',
           abilities: ['OPEN'],
           dataType: 'blob',
           mtime: new Date(metadata.modificationTime).getTime(),
           size: metadata.size
         });
       } else {
         resolve({
           source: 'domfs',
           abilities: ['LIST'],
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
