// Copyright 2015 Google Inc. All rights reserved.
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

/**
 * @constructor
 *
 * @param {number=} opt_mode
 */
var StatResult = function(opt_mode) {
  /** @type {number} */
  this.mode = opt_mode || 0;
  /** @type {number} */
  this.mtime = 0;
  /** @type {number} */
  this.size = 0;
  /** @type {Object} */
  this.signature = null;
};

export {StatResult};
export default StatResult;
