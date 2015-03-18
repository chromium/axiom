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
 * @param {Object} props File properties; allowed values are the same as this
 *   class' own properties.
 */
var StatResult = function(props) {
  /** @type {number} */
  this.mode = props.mode || 0;
  /** @type {number} */
  this.mtime = props.mtime || 0;
  /** @type {number} */
  this.size = props.size || 0;
  /** @type {string} */
  this.mimeType = props.mimeType || '';
  /** @type {Object} */
  this.signature = props.signature || null;
};

export {StatResult};
export default StatResult;
