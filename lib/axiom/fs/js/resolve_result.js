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

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var BaseFileSystem;

/** @typedef JsEntry$$module$axiom$fs$js$entry */
var JsEntry;

/**
 * @constructor
 * Represents the result of an attempt to resolve a path.
 *
 * prefixList is the array of path elements that lead up to the entry.
 * suffixList is the array of path elements that were not found.
 * entry is the jsfs filesystem entry where the resolve terminated.
 *
 * If entry is not null and the suffixList is empty, the resolved succeeded
 * in finding the entire path, and entry is the target entry.
 *
 * If entry is not null but the suffixList is not empty, the path was not found.
 * The prefixList can be used to determine where in the path the resolve failed.
 *
 * If entry is null the path was invalid.
 *
 * @param {Array<string>} prefixList  The list of path elements that were found.
 * @param {Array<string>} suffixList  The list of path elements that were not.
 * @param {JsEntry|BaseFileSystem} entry  The entry for the final item in
 *   prefixList.
 */
export var JsResolveResult = function(prefixList, suffixList, entry) {
  this.prefixList = prefixList || [];
  this.suffixList = suffixList || [];
  this.entry = entry;

  this.isFinal = (entry && this.suffixList.length === 0);
};

export default JsResolveResult;
