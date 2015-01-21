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
