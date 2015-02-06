// Copyright (c) 2015 Google Inc. All rights reserved.
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
 * Null values indicate that the given property is not known.  Unknown
 * properties are not propagated in the copyFrom/copyTo methods.
 */
export var TTYState = function() {
  /** @type {?boolean} */
  this.isatty = null;

  /** @type {?number} */
  this.rows = null;

  /** @type {?number} */
  this.columns = null;

  /** @type {?string} */
  this.interrupt = null;
};

export default TTYState;

/**
 * ^C
 */
TTYState.defaultInterruptChar = String.fromCharCode('C'.charCodeAt(0) - 64);

/**
 * Copy values from another TTYState instance or an arbitrary object.
 *
 * @param {Object} obj
 */
TTYState.prototype.copyFrom = function(obj) {
  if ('isatty' in obj && obj.isatty != null)
    this.isatty = !!obj.isatty;

  if ('rows' in obj && obj.rows != null)
    this.rows = obj.rows;

  if ('columns' in obj && obj.columns != null)
    this.columns = obj.columns;

  if (!this.rows || !this.columns) {
    this.rows = 0;
    this.columns = 0;
    this.isatty = false;
  } else {
    this.isatty = true;
  }

  if (this.rows < 0 || this.columns < 0)
    throw new Error('Invalid tty size.');

  if ('interrupt' in obj && obj.interrupt != null)
    this.interrupt = obj.interrupt;
};

/**
 * @param {Object} obj
 */
TTYState.prototype.copyTo = function(obj) {
  if (this.isatty != null)
    obj.isatty = this.isatty;
  if (this.rows != null)
    obj.rows = this.rows;
  if (this.columns != null)
    obj.columns = this.columns;
  if (this.interrupt != null)
    obj.interrupt = this.interrupt;
};

/**
 * @return {TTYState}
 */
TTYState.prototype.clone = function() {
  var rv = new TTYState();
  rv.copyFrom(this);
  return rv;
};
