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
 * @param {string} spec An absolute path specification ('root:path').
 */
var Path = function(spec) {
  this.originalSpec = spec; // the path you gave.

  /** @type {boolean} */
  this.isValid = true;  // True if the path was parsed, false if not.

  /** @type {string} */
  this.root = '';

  var colonIndex = spec.indexOf(Path.rootSeparator);
  if (colonIndex <= 0) {
    this.isValid = false;
    colonIndex = -1;
  } else {
    this.root = spec.substr(0, colonIndex);
  }

  var elements = [];

  var specNames = Path.split_(spec.substr(colonIndex + 1));
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

  /** @type {Array<string>} */
  this.elements = this.isValid ? elements : [];

  /** @type {string} */
  this.relSpec = Path.separator + this.elements.join(Path.separator);

  /** @type {string} */
  this.spec = this.root + Path.rootSeparator + this.relSpec;
};

export {Path};
export default Path;

/**
 * @enum {number}
 * Enumeration of the supported file modes and their bit masks.
 */
Path.Mode = {
  X: 0x01,  // executable
  W: 0x02,  // writable
  R: 0x04,  // readable
  D: 0x08,  // directory
  K: 0x10   // seekable
};

/**
 * Convert a mode string to a bit mask.
 *
 * @param {string} modeStr
 * @return {number}
 */
Path.modeStringToInt = function(modeStr) {
  return modeStr.split('').reduce(
      function(p, v) {
        if (!(v in Path.Mode))
          throw new Error('Unknown mode char: ' + v);

        return p | Path.Mode[v];
      }, 0);
};

/**
 * Convert a mode bit mask to a string.
 *
 * @param {number} modeInt
 * @return {string}
 */
Path.modeIntToString = function(modeInt) {
  var rv = '';
  Object.keys(Path.Mode).forEach(function(key) {
      if (modeInt & Path.Mode[key])
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
Path.rootSeparator = ':';

/**
 * @type {string}
 */
Path.separator = '/';

/**
 * Accepts varargs of strings or arrays of strings, and returns a string of
 * all path elements joined with Path.separator.
 *
 * @param {...(string|Array<string>)} var_args
 * @return {string}
 */
Path.join = function(var_args) {
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

/**
 * @param {string} pwd
 * @param {string} pathSpec
 * @return {Path}
 */
Path.abs = function(pwd, pathSpec) {
  // If path is valid (and absolute), ignore pwd.
  var path = new Path(pathSpec);
  if (path.isValid) {
    return path;
  }

  // Parse pwd, fail if it is not valid.
  var pwdPath = new Path(pwd);
  if (!pwdPath.isValid) {
    // Return an invalid path
    return path;
  }

  if (pathSpec[0] == '/') {
    // Pathspec is absolute to the current filesystem.
    return new Path(pwdPath.root + Path.rootSeparator + pathSpec);
  }

  // Return pwd and pathSepc concatenated.
  if (pathSpec.substr(0, 2) == './')
    pathSpec = pathSpec.substr(2);

  return new Path(pwdPath.spec + '/' + pathSpec);
};

/**
 * @private
 * @param {string} spec
 * @return {Array<string>}
 */
Path.split_ = function(spec) {
  return spec.split(/\//g);
};

/**
 * Combine the path with the given relative path spec.
 * @param {string} relSpec
 * @return {!Path}
 */
Path.prototype.combine = function(relSpec) {
  return new Path(this.spec + Path.separator + relSpec);
};

/**
 * Return the parent spec, including the file system name.
 * @private
 * @return {string}
 */
Path.prototype.getParentSpec_ = function() {
  return this.root + Path.rootSeparator +
      this.elements.slice(0, this.elements.length - 1).join(Path.separator);
};

/**
 * Return the parent path, including the file system name.
 * @return {Path}
 */
Path.prototype.getParentPath = function() {
  if (this.elements.length === 0)
    return null;

  return new Path(this.getParentSpec_());
};

/**
 * Return the last component of the path.
 * @return {string}
 */
Path.prototype.getBaseName = function() {
  return this.elements[this.elements.length - 1];
};
