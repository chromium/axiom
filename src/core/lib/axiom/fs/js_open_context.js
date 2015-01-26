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

import OpenContext from 'axiom/bindings/fs/open_context';

import JsEntry from 'axiom/fs/js_entry';
import JsData from 'axiom/fs/js_data';
import Path from 'axiom/fs/path';

/** @typedef JsFileSystem$$module$axiom$fs$js_file_system */
var JsFileSystem;

/**
 * Construct a new context that can be used to open a file.
 *
 * @constructor
 * @param {JsFileSystem} jsfs
 * @param {Path} path
 * @param {JsEntry} entry
 * @param {Object} arg
 */
var JsOpenContext = function(jsfs, path, entry, arg) {
  this.jsfs = jsfs;
  this.path = path;
  this.targetEntry = entry;
  this.arg = arg;

  this.binding = new OpenContext(jsfs.binding, path.spec, arg);
  this.binding.bind(this, {
    open: this.open_,
    seek: this.seek_,
    read: this.read_,
    write: this.write_
  });

  this.binding.ready();
};

export {JsOpenContext};
export default JsOpenContext;

JsOpenContext.prototype.open_ = function() {
  if (!(this.targetEntry.mode & (Path.Mode.R | Path.Mode.W))) {
    return Promise.reject(this.binding.closeError(
        'TypeMismatch', ['openable', this.path.spec]));
  }

  return Promise.resolve();
};

JsOpenContext.prototype.seek_ = function(arg) {
  if (!(this.targetEntry.mode & Path.Mode.K)) {
    return Promise.reject(new AxiomError(
        'TypeMismatch', ['seekable', this.path.spec]));
  }

  return this.binding.seek(arg);
};

JsOpenContext.prototype.read_ = function(arg) {
  if (!(this.targetEntry.mode & Path.Mode.R)) {
    return Promise.reject(new AxiomError(
        'TypeMismatch', ['readable', this.path.spec]));
  }

  return this.binding.read(arg);
};

JsOpenContext.prototype.write_ = function(arg) {
  if (!(this.targetEntry.mode & Path.Mode.W)) {
    return Promise.reject(new AxiomError(
        'TypeMismatch', ['writable', this.path.spec]));
  }

  return this.binding.write(arg);
};
