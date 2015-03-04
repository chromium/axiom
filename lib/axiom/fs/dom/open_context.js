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

import DataType from 'axiom/fs/data_type';
import WriteResult from 'axiom/fs/write_result';
import ReadResult from 'axiom/fs/read_result';
import SeekWhence from 'axiom/fs/seek_whence';
import FileSystem from 'axiom/fs/base/file_system';

import OpenContext from 'axiom/fs/base/open_context';

import domfsUtil from 'axiom/fs/dom/domfs_util';

import Path from 'axiom/fs/path';

/** @typedef DomFileSystem$$module$axiom$fs$dom$file_system */
var DomFileSystem;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/**
 * @constructor @extends {OpenContext}
 * Construct a new context that can be used to open a file.
 *
 * @param {!DomFileSystem} domfs
 * @param {Path} path
 * @param {string|OpenMode} mode
 */
export var DomOpenContext = function(domfs, path, mode) {
  OpenContext.call(this, domfs, path, mode);

  this.onFileError_ = domfsUtil.rejectFileError.bind(null, path.spec);

  // The current read/write position.
  this.position_ = 0;

  // The DOM FileEntry we're operation on.
  this.entry_ = null;

  // THe DOM file we're operating on.
  this.file_ = null;
};

export default DomOpenContext;

DomOpenContext.prototype = Object.create(OpenContext.prototype);

/**
 * If whence is undefined, this call succeeds with no side effects.
 *
 * @override
 * @param {number} offset
 * @param {SeekWhence} whence
 * @return {!Promise<undefined>}
 */
DomOpenContext.prototype.seek = function(offset, whence) {
  return OpenContext.prototype.seek.call(this, offset, whence).then(function() {
    var fileSize = this.file_.size;
    var start = this.position_;

    if (!whence)
      return Promise.resolve();

    if (whence == SeekWhence.Begin) {
      start = offset;

    } else if (whence == SeekWhence.Current) {
      start += offset;

    } else if (whence == SeekWhence.End) {
      start = fileSize + offset;
    }

    if (start > fileSize) {
      return Promise.reject(new AxiomError.Runtime('reached end of file.'));
    }

    if (start < 0) {
      return Promise.reject(new AxiomError.Runtime(
          'Invalid file offset: ' + this.path.spec));
    }

    this.position_ = start;
    return Promise.resolve();
  }.bind(this));
};

/**
 * Returns a promise that completes when the open is no longer valid.
 *
 * @override
 * @return {!Promise<undefined>}
 */
DomOpenContext.prototype.open = function() {
  return OpenContext.prototype.open.call(this).then(function() {
    return new Promise(function(resolve, reject) {
      var onFileError = this.onFileError_.bind(null, reject);
      var onStat = function(stat) {
        this.entry_.file(function(f) {
            this.file_ = f;
              this.ready();
            return resolve();
        }.bind(this), onFileError);
      }.bind(this);

      var onFileFound = function(entry) {
        this.entry_ = entry;
        if (this.mode.write && this.mode.truncate) {
          this.entry_.createWriter(
              function(writer) {
                writer.truncate(0);
                domfsUtil.statEntry(entry).then(onStat).catch(onFileError);
              },
              reject);
          return;
        }

        domfsUtil.statEntry(entry).then(function(value) {
          onStat(value);
        }).catch(function(e) {
          reject(e);
        });
      }.bind(this);

      this.fileSystem.fileSystem.root.getFile(
          domfsUtil.makeDomfsPath(this.path),
          {create: this.mode.create,
           exclusive: this.mode.exclusive
          },
          onFileFound, onFileError);
    }.bind(this));
  }.bind(this));
};

/**
 * @override
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} datatype
 * @return {!Promise<!ReadResult>}
 */
DomOpenContext.prototype.read = function(offset, whence, dataType) {
  return OpenContext.prototype.read.call(this, offset, whence, dataType).then(
      function(readResult) {
    return new Promise(function(resolve, reject) {
      this.seek(offset, whence).then(function() {

        var fileSize = this.file_.size;
        var end;
        if (offset) {
          end = this.position_ + offset;
        } else {
          end = fileSize;
        }

        dataType = dataType || DataType.UTF8String;
        var reader = new FileReader();

        reader.onload = function(e) {
          this.position_ = end + 1;
          var data = reader.result;

          if (dataType == 'base64-string' && typeof data == 'string') {
            // TODO: By the time we read this into a string the data may already
            // have been munged.  We need an ArrayBuffer->Base64 string
            // implementation to make this work for real.
            data = window.btoa(data);
          }

            readResult.data = data;
            return resolve(readResult);
        }.bind(this);

        reader.onerror = function(error) {
          return this.onFileError_(reject, error);
        };

        var slice = this.file_.slice(this.position_, end);
        if (dataType == 'blob') {
            readResult.data = slice;
            return resolve(readResult);
        }  else if (dataType == 'arraybuffer') {
          reader.readAsArrayBuffer(slice);
        } else {
          reader.readAsText(slice);
        }
      }.bind(this));
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
DomOpenContext.prototype.write = function(offset, whence, dataType, data) {
  return OpenContext.prototype.write.call(this, offset, whence, dataType, data)
      .then(function(writeResult) {
    dataType = dataType || DataType.UTF8String;
    return new Promise(function(resolve, reject) {
      var onWriterReady = function(writer) {
        var blob;
        if (data instanceof Blob) {
          blob = data;
        } else if (data instanceof ArrayBuffer) {
          blob = new Blob([data], {type: 'application/octet-stream'});
        } else if (dataType == 'base64-string' && typeof data == 'string') {
          // TODO: Once we turn this into a string the data may already have
          // been munged.  We need an ArrayBuffer->Base64 string implementation
          // to make this work for real.
          blob = new Blob([window.atob(data)],
                          {type: 'application/octet-stream'});
        } else if (dataType == 'utf8-string') {
          blob = new Blob([data],  {type: 'text/plain'});
        } else if (dataType == 'value') {
          blob = new Blob([JSON.stringify(data)],  {type: 'text/json'});
        }

        writer.onerror = function(error) {
          return this.onFileError_(reject, error);
        }.bind(this);

        writer.onwrite = function() {
          this.position_ = this.position_ + blob.size;
            return resolve(writeResult);
        }.bind(this);

        writer.seek(this.position_);
        writer.write(blob);
      }.bind(this);

      this.seek(offset, whence).then(function() {
        this.entry_.createWriter(
            onWriterReady,
            this.onFileError_.bind(null, reject));
      }.bind(this));
    }.bind(this));
  }.bind(this));
};
