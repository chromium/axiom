// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * The base class for all of the things that can appear in a JsFileSystem.
 *
 * @constructor
 * @param {JsFileSystem} jsfs  The parent file system.
 * @param {string} modeStr
 */
export var JsEntry = function(jsfs, modeStr) {
  this.jsfs = jsfs;
  this.mode = JsEntry.modeStrToInt(modeStr);
};

export default JsEntry;

/**
 * Enumeration of the supported file modes and their bit masks.
 */
JsEntry.mode = {
  x: 0x01,  // executable
  w: 0x02,  // writable
  r: 0x04,  // readable
  d: 0x08,  // directory
  k: 0x0F   // seekable
};

/**
 * Convert a most string to a bit mask.
 *
 * @param {string} modeStr
 */
JsEntry.modeStrToInt = function(modeStr) {
  return modeStr.split('').reduce(
      function(p, v) {
        return p | (JsEntry.mode[v] || 0);
      }, 0);
};

/**
 * Return true if file has all of the modes in the given modeString.
 *
 * @param {string} modeStr
 */
JsEntry.prototype.hasMode = function(modeStr) {
  return (this.mode & JsEntry.modeStrToInt(modeStr));
};

/**
 * Default stat implementation.
 *
 * Overridden stat() implementations should call this first and decorate the
 * result with additional proeprties.
 */
JsEntry.prototype.stat = function() {
  return { mode: this.mode };
};
