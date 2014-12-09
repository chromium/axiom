// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Path from 'axiom/fs/path';

export var DomfsUtil = {};

/**
 * Get an appropriate 'stat' value for the given HTML5 FileEntry or
 * DirEntry object.
 */
DomfsUtil.statEntry = function(entry) {
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

export default DomfsUtil;
