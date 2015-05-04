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

import AxiomError from 'axiom/core/error';

import DataType from 'axiom/fs/data_type';
import WriteResult from 'axiom/fs/write_result';
import ReadResult from 'axiom/fs/read_result';
import SeekWhence from 'axiom/fs/seek_whence';
import FileSystem from 'axiom/fs/base/file_system';

import OpenContext from 'axiom/fs/base/open_context';

import gdrivefsUtil from 'axiom/fs/gdrive/gdrivefs_util';

import Path from 'axiom/fs/path';

/** @typedef GDriveFileSystem$$module$axiom$fs$gdrive$file_system */
var GDriveFileSystem;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/**
 * @constructor @extends {OpenContext}
 * Construct a new context that can be used to open a file.
 *
 * @param {!GDriveFileSystem} gdrivefs
 * @param {Path} path
 * @param {string|OpenMode} mode
 * @param {string=} opt_mimeType
 */
export var GDriveOpenContext = function(gdrivefs, path, mode, opt_mimeType) {
  OpenContext.call(this, gdrivefs, path, mode);

  // The MIME type of the file.
  // For read contexts:
  // - real files: must either be falsy or match the actual file's type; 
  // - Google docs: must match one of the conversion formats provided by GDrive.
  // For write contexts:
  // - can be anything;
  // - if omitted, GDrive will auto-detect the type from the file's extension.
  this.mimeType_ = opt_mimeType;

  // The contents of the downloaded ("real") or converted (Google doc) file.
  this.data_ = '';

  // The current read/write position.
  this.position_ = 0;
};

export default GDriveOpenContext;

GDriveOpenContext.prototype = Object.create(OpenContext.prototype);

/**
 * @override
 * @return {!Promise<undefined>} Operation completion
 */
GDriveOpenContext.prototype.open = function() {
  return OpenContext.prototype.open.call(this).then(function() {
    if (this.mode.read) {
      return gdrivefsUtil.downloadFile(this.path, this.mimeType_).then(
          function(data) {
        this.data_ = data;
        this.ready();
      }.bind(this));
    }

    // TODO(ussuri): Support `write` without `truncate`.
    if (this.mode.write && this.mode.truncate) {
      this.data_ = '';
      this.ready();
      return Promise.resolve();
    }

    this.closeError(new AxiomError.Invalid('open mode', this.mode));
  }.bind(this));
};

/**
 * If whence is undefined, this call succeeds with no side effects.
 *
 * @override
 * @param {number} offset
 * @param {SeekWhence} whence
 * @return {!Promise<undefined>}
 */
GDriveOpenContext.prototype.seek = function(offset, whence) {
  return OpenContext.prototype.seek.call(this, offset, whence).then(function() {
    try {
      this.position_ = this.calcSeekPosition(
          offset, whence, this.position_, this.data_.size);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }.bind(this));
};

/**
 * @override
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} dataType
 * @return {!Promise<!ReadResult>}
 */
GDriveOpenContext.prototype.read = function(offset, whence, dataType) {
  // TODO(ussuri): In v.1.0, limit support to UTF-8 only.
  if (dataType != DataType.UTF8String)
    throw new AxiomError.Invalid('dataType', dataType);

  return OpenContext.prototype.read.call(this, offset, whence, dataType)
      .then(function(readResult) {
    return this.seek(offset, whence).then(function() {
      readResult.data = this.data_.substr(
          this.position_,
          offset ? (this.position_ + offset) : this.data_.size
      );
      return readResult;
    }.bind(this));
  }.bind(this));
};

/**
 * @override
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} dataType
 * @param {*} data
 * @return {!Promise<!WriteResult>}
 */
GDriveOpenContext.prototype.write = function(offset, whence, dataType, data) {
  return OpenContext.prototype.write.call(this, offset, whence, dataType, data)
      .then(function(writeResult) {
    // TODO(ussuri): In v.1.0, ignore dataType.
    return this.seek(offset, whence).then(function() {
      this.data_ =
          this.data_.substring(0, this.position_) +
          data +
          this.data_.substring(this.position_ + data.length);
      return gdrivefsUtil.uploadFile(this.path, this.data_, this.mimeType_)
          .then(function() {
        return writeResult;
      });
    }.bind(this));
  }.bind(this));
};
