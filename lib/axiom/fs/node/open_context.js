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
import ReadResult from 'axiom/fs/read_result';
import SeekWhence from 'axiom/fs/seek_whence';
import DataType from 'axiom/fs/data_type';

import OpenContext from 'axiom/fs/base/open_context';

import nodefsUtil from 'axiom/fs/node/nodefs_util';

import Path from 'axiom/fs/path';

/** @typedef NodeFileSystem$$module$axiom$fs$node$file_system */
var NodeFileSystem;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/**
 * @constructor @extends {OpenContext}
 * Construct a new context that can be used to open a file.
 *
 * @param {NodeFileSystem} nodefs
 * @param {string} pathSpec
 * @param {string|OpenMode} mode
 */
export var NodeOpenContext = function(nodefs, pathSpec, mode) {

  OpenContext.call(this, nodefs, pathSpec, mode);

  this.pathSpec = '/' + this.pathSpec;

  this.onFileError_ = nodefsUtil.rejectFileError.bind(null, pathSpec);

  // The Node FileEntry we're operation on.
  this.entry_ = null;

  // The Node fd we're operating on.
  this.fd = null;

};

export default NodeOpenContext;

NodeOpenContext.prototype = Object.create(OpenContext.prototype);

/**
 * @param {number} offset
 * @param {SeekWhence} whence
 * @return {!Promise<undefined>}
 */
OpenContext.prototype.seek_ = function(offset, whence) {
    return Promise.reject(
        new AxiomError.TypeMismatch('seekable', this.pathSpec));
};

/**
 * @param {OpenMode} mode
 * @returns {string} mode string.
 */
NodeOpenContext.prototype.convertModeToString_ = function(mode) {
  var modeString = '';

  if (this.mode.write || this.mode.create) {
    modeString = 'w';
  }

  if (this.mode.exclusive) {
    modeString += 'x';
  }

  if (this.mode.read) {
    if (modeString == '')
      modeString = 'r';
    else {
      modeString += '+';
    }
  }
  return modeString;
}

/**
 * Initiate the open.
 *
 * Returns a promise that completes when the open is no longer valid.
 *
 * @return {!Promise<undefined>}
 */
NodeOpenContext.prototype.open = function() {
  return new Promise(function(resolve, reject) {
    this.fileSystem.fileSystem.exists(this.pathSpec, function(exists) {
     console.log(this.pathSpec);
     console.log(exists);
     console.log('got exisist');
      if (!exists) {
        reject(new AxiomError.Invalid('Invalid path: ', this.pathSpec));
      } else if (this.mode.exclusive) {
        reject(new AxiomError.Invalid('Invalid path: ', this.pathSpec));
      }

      var mode = this.convertModeToString_(this.mode);

      this.fileSystem.fileSystem.open(this.pathSpec, mode, function(err, fd) {
        if (err) {
          reject(err);
        }
        this.fd = fd;
        resolve();
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

/**
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} dataType
 * @return {!Promise<!ReadResult>}
 */
NodeOpenContext.prototype.read = function(offset, whence, dataType) {
  var fs = this.fileSystem.fileSystem;
  return new Promise(function(resolve, reject) {
    /*if (dataType != 'utf8-string') {
      reject(new AxiomError.NotImplemented(dataType + ': not supportd.'));
    }*/

    if (offset != 0 || whence != SeekWhence.Begin) {
      reject(new AxiomError.Invalid('whence is not supported.', whence));
    }

    fs.fstat(this.fd, function(err, stats) {
      var bufferSize=stats.size;
      var chunkSize=512;
      var buffer = new Buffer(bufferSize);
      var bytesRead = 0;

      while (bytesRead < bufferSize) {
        if ((bytesRead + chunkSize) > bufferSize) {
          chunkSize = (bufferSize - bytesRead);
        }
        fs.read(this.fd, buffer, bytesRead, chunkSize, bytesRead);
        bytesRead += chunkSize;
      }
      fs.close(this.fd);
      var result = new ReadResult(0, null, dataType);
      result.data = buffer.toString('utf8', 0, bufferSize);
      resolve(result);
    }.bind(this));
  }.bind(this));
};

/**
 * Handle a write event.
 */
NodeOpenContext.prototype.write_ = function(arg) {
  if (!arg) {
    return Promise.reject(new AxiomError.Missing('arg'));
  }
  var dataType = arg.dataType || 'utf8-string';
  return new Promise(function(resolve, reject) {
    var onWriterReady = function(writer) {
      var blob;
      if (arg.data instanceof Blob) {
        blob = arg.data;
      } else if (arg.data instanceof ArrayBuffer) {
        blob = new Blob([arg.data], {type: 'application/octet-stream'});
      } else if (dataType == 'base64-string' && typeof arg.data == 'string') {
        // TODO: Once we turn this into a string the data may already have
        // been munged.  We need an ArrayBuffer->Base64 string implementation to
        // make this work for real.
        blob = new Blob([window.atob(arg.data)],
                        {type: 'application/octet-stream'});
      } else if (dataType == 'utf8-string') {
        blob = new Blob([arg.data],  {type: 'text/plain'});
      } else if (dataType == 'value') {
        blob = new Blob([JSON.stringify(arg.data)],  {type: 'text/json'});
      }

      writer.onerror = function(error) {
        return this.onFileError_(reject, error);
      }.bind(this);

      writer.onwrite = function() {
        this.position_ = this.position_ + blob.size;
        resolve(null);
      }.bind(this);

      writer.seek(this.position_);
      writer.write(blob);
    }.bind(this);

    /*this.seek_(arg).then(function(rv) {
      if (!rv) {
        return reject();
      }
      this.entry_.createWriter(
          onWriterReady,
          this.onFileError_.bind(null, reject));
    }.bind(this));*/
  }.bind(this));
};
