// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
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
 * @constructor
 * @param {Array<string>} prefixList  The list of path elements that were found.
 * @param {Array<string>} suffixList  The list of path elements that were not.
 * @param {JsEntry} entry  The entry for the final item in prefixList.
 */
export var JsFsResolveResult = function(prefixList, suffixList, entry) {
  this.prefixList = prefixList || [];
  this.suffixList = suffixList || [];
  this.entry = entry;

  this.isFinal = (entry && this.suffixList.length === 0);
};

export default JsFsResolveResult;
