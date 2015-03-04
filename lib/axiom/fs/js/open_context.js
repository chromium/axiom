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

import AxiomError from 'axiom/core/error';

import OpenContext from 'axiom/fs/base/open_context';

import JsEntry from 'axiom/fs/js/entry';
import JsValue from 'axiom/fs/js/value';

import Path from 'axiom/fs/path';

/** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
var JsFileSystem;

/** @typedef {OpenMode$$module$axiom$fs$open_mode} */
var OpenMode;

/**
 * @constructor @extends {OpenContext}
 *
 * Construct a new context that can be used to open a file.
 *
 * @param {JsFileSystem} jsfs
 * @param {Path} path
 * @param {JsValue} entry
 * @param {string|OpenMode} mode
 */
export var JsOpenContext = function(jsfs, path, entry, mode) {
  OpenContext.call(this, jsfs, path, mode);

  /** @type {JsValue} */
  this.targetEntry = entry;
};

export default JsOpenContext;

JsOpenContext.prototype = Object.create(OpenContext.prototype);

/**
 * @override
 */
JsOpenContext.prototype.open = function() {
  return OpenContext.prototype.open.call(this).then(function() {
    if (!(this.targetEntry instanceof JsValue)) {
      return Promise.reject(
          new AxiomError.TypeMismatch('openable', this.path.spec));
    }

    this.ready();
    return Promise.resolve();
  }.bind(this));
};

/**
 * @override
 */
JsOpenContext.prototype.seek = function(offset, whence) {
  return OpenContext.prototype.seek.call(this, offset, whence).then(function() {
    if (!(this.targetEntry.mode & Path.Mode.K)) {
      return Promise.reject(
          new AxiomError.TypeMismatch('seekable', this.path.spec));
    }
  }.bind(this));
};

/**
 * @override
 */
JsOpenContext.prototype.read = function(offset, whence, dataType) {
  return OpenContext.prototype.read.call(this, offset, whence, dataType).then(
      function(readResult) {
    if (!(this.targetEntry.mode & Path.Mode.R)) {
      return Promise.reject(
          new AxiomError.TypeMismatch('readable', this.path.spec));
    }

    return this.targetEntry.read(readResult);
  }.bind(this));
};

/**
 * @override
 */
JsOpenContext.prototype.write = function(offset, whence, dataType, data) {
  return OpenContext.prototype.write.call(this, offset, whence, dataType, data)
      .then(function(writeResult) {
    if (!(this.targetEntry.mode & Path.Mode.W)) {
      return Promise.reject(
          new AxiomError.TypeMismatch('writable', this.path.spec));
    }

    return this.targetEntry.write(writeResult, data);
  }.bind(this));
};
