// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {string} spec
 */
export var Path = function(spec) {
  this.originalSpec = spec; // the path you gave.

  this.isValid = true;  // True if the path was parsed, false if not.

  var elements = [];
  var specNames = Path.split(spec);
  if (!specNames) {
    this.isValid = false;
  } else {
    for (var i = 0; i < specNames.length; i++) {
      var name = specNames[i];
      if (!name || name == '.')
        continue;

      if (name == '..') {
        elements.pop();
      } else if (Path.reValidName.test(name)) {
        elements.push(name);
      } else {
        this.isValid = false;
        break;
      }
    }
  }

  this.elements = this.isValid ? elements : [];
  this.spec = this.elements.join('/');
};

export default Path;

/**
 * RegExp matches valid path names.
 * @type {RegExp}
 */
Path.reValidName = /[\w\d\-\.\,\+~\ ]/i;

/**
 * @type {string}
 */
Path.separator = '/';

/**
 * Accepts varargs of strings or arrays of strings, and returns a string of
 * all path elements joined with Path.separator.
 */
Path.join = function(/* ... */) {
  var args = [];

  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] instanceof Array) {
      args[i] = arguments[i].join(Path.separator);
    } else {
      args[i] = arguments[i];
    }
  }

  return args.join(Path.separator);
};

/**
 * @param {string} spec
 */
Path.split = function(spec) {
  return spec.split(/\//g);
};

/**
 * @return {string}
 */
Path.prototype.getParentSpec = function() {
  return this.elements.slice(0, this.elements.length - 1).join(Path.separator);
};

/**
 * @return {Path}
 */
Path.prototype.getParentPath = function() {
  return new Path(this.getParentSpec());
};

/**
 * @return {string}
 */
Path.prototype.getBaseName = function() {
  return this.elements[this.elements.length - 1];
};
