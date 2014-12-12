// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import OpenContextBinding from 'axiom/bindings/fs/open_context';

import JsEntry from 'axiom/fs/js_entry';
import JsData from 'axiom/fs/js_data';
import Path from 'axiom/fs/path';

/**
 * Construct a new context that can be used to open a file.
 *
 * @constructor
 * @param {JsFileSystem} jsfs
 * @param {Path} path
 * @param {JsEntry} entry
 * @param {Object} arg
 */
export var JsOpenContext = function(jsfs, path, entry, arg) {
  this.jsfs = jsfs;
  this.path = path;
  this.targetEntry = entry;
  this.arg = arg;

  this.binding = new OpenContextBinding(jsfs.binding, path.spec, arg);
  this.binding.bind(this, {
    open: this.open_,
    seek: this.seek_,
    read: this.read_,
    write: this.write_
  });

  this.binding.ready();
};

JsOpenContext.prototype.open_ = function() {
  if (!(this.targetEntry.mode & (JsEntry.mode.r | JsEntry.mode.w))) {
    return Promise.reject(this.binding.closeError(
        'TypeMismatch', 'openable', this.path.spec));
  }

  return Promise.resolve();
};

JsOpenContext.prototype.seek_ = function(arg) {
  if (!(this.targetEntry.mode & JsEntry.mode.k)) {
    return Promise.reject(new AxiomError(
        'TypeMismatch', 'seekable', this.path.spec));
  }

  return this.targetEntry.seek(arg);
};

JsOpenContext.prototype.read_ = function(arg) {
  if (!(this.targetEntry.mode & JsEntry.mode.r)) {
    return Promise.reject(new AxiomError(
        'TypeMismatch', 'readable', this.path.spec));
  }

  return this.targetEntry.read(arg);
};

JsOpenContext.prototype.write_ = function(arg) {
  if (!(this.targetEntry.mode & JsEntry.mode.w)) {
    return Promise.reject(new AxiomError(
        'TypeMismatch', 'writable', this.path.spec));
  }

  return this.targetEntry.write(arg);
};
