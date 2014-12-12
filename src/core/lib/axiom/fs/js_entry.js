// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Path from 'axiom/fs/path';

/**
 * The base class for all of the things that can appear in a JsFileSystem.
 *
 * @constructor
 * @param {JsFileSystem} jsfs  The parent file system.
 * @param {string} modeStr
 */
export var JsEntry = function(jsfs, modeStr) {
  this.jsfs = jsfs;
  this.mode = Path.modeStringToInt(modeStr);
};

export default JsEntry;

/**
 * Return true if file has all of the modes in the given modeString.
 *
 * @param {string} modeStr
 */
JsEntry.prototype.hasMode = function(modeStr) {
  return (this.mode & Path.modeStringToInt(modeStr));
};

/**
 * Default stat implementation.
 *
 * Overridden stat() implementations should call this first and decorate the
 * result with additional proeprties.
 */
JsEntry.prototype.stat = function() {
  return Promise.resolve({mode: this.mode});
};
