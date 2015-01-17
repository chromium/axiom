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

/**
 * @constructor
 * @param {string} spec
 */
var Path = function(spec) {
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

export {Path};
export default Path;

/**
 * Enumeration of the supported file modes and their bit masks.
 */
Path.mode = {
  x: 0x01,  // executable
  w: 0x02,  // writable
  r: 0x04,  // readable
  d: 0x08,  // directory
  k: 0x10   // seekable
};

/**
 * Convert a most string to a bit mask.
 *
 * @param {string} modeStr
 */
Path.modeStringToInt = function(modeStr) {
  return modeStr.split('').reduce(
      function(p, v) {
        return p | (Path.mode[v] || 0);
      }, 0);
};

Path.modeIntToString = function(modeInt) {
  var rv = '';
  Object.keys(Path.mode).forEach(function(key) {
      if (modeInt & Path.mode[key])
        rv += key;
    });
  return rv;
};

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

  return args.join(Path.separator).replace(/\/+/g, '/');
};

Path.abs = function(pwd, path) {
  if (path.substr(0, 1) == '/')
    return path;

  if (path.substr(0, 2) == './')
    path = path.substr(2);

  return (pwd || '/') + path;
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
