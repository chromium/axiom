// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Registry of filesystems.
 */
export var FileSystemManager = function() {

};

export default FileSystemManager;

/**
 * Extending the FileSystemManager adds to the list of known filesystems.
 *
 * The extension descriptor should enumerate the filesystem names to be added,
 * and the binding should provide a 'get' function which takes (name) and
 * returns a promise to the requested filesystem.
 */
FileSystemManager.prototype.extend = function(extension) {

};
