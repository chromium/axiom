// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import OpenContextBinding from 'axiom/bindings/fs/open_context';

import Path from 'axiom/fs/path';

/**
 * Construct a new context that can be used to open a file.
 *
 * @constructor
 * @param {DomFileSystem} domfs
 * @param {Path} path
 * @param {Entry} FileEntry
 * @param {Object} arg
 */
export var DomOpenContext = function(domfs, path, entry, arg) {
  this.domfs = domfs;
  this.path = path;
  this.arg = arg;
  
  // The current read/write position.
  this.position_ = 0;
 
  // The DOM FileEntry we're operation on.
  this.entry_ = entry;

  // THe DOM file we're operating on.
  this.file_ = null;
  
  this.binding = new OpenContextBinding(domfs.binding, path.spec, arg);
  this.binding.bind(this, {
    open: this.open_,
    seek: this.seek_,
    read: this.read_,
    write: this.write_
  });

  this.binding.ready();
};

DomOpenContext.prototype.open_ = function() {
  //if (!(this.entry_.mode & (JsEntry.mode.r | JsEntry.mode.w))) {
    return Promise.reject(this.binding.closeError(
        'TypeMismatch', 'openable', this.path.spec));
  //}

  //return Promise.resolve();
};

/**
 * Utility function to perform a seek (update this.position_).
 *
 * Invokes onError with a axiom.FileSystem.Error value.
 *
 * If the arg object does not have a 'whence' property, this call succeeds
 * with no side effects.
 *
 * @param {Object} arg An object containing 'whence' and 'offset' arguments
 *  describing the seek operation.
 */
DomOpenContext.prototype.seek_ = function(arg) {
  var fileSize = this.file_.size;
  var start = this.position_;

  if (!arg.whence)
    return true;

  if (arg.whence == 'begin') {
    start = arg.offset;

  } else if (arg.whence == 'current') {
    start += arg.offset;

  } else if (arg.whence == 'end') {
    start = fileSize + arg.offset;
  }

  if (start > fileSize) {
    //onError(wam.mkerr('wam.FileSystem.Error.EndOfFile', []));
    return Promise.reject(false);
  }

  if (start < 0) {
    return Promise.reject(new AxiomError('Invalid', ['file offset', this.path.spec]));
  }

  this.position_ = start;
  return Promise.resolve();
};

/**
 * Convenience method to convert a FileError to a axiom error 
 * close this context with it.
 *
 * Used in the context of a FileEntry.
 */
DomOpenContext.prototype.onFileError_ = function(error) {
  //this.onWamError_(wam.jsfs.dom.convertFileError(error, this.path));
};

/**
 * Convenience method to convert a FileError to a Axiom.FileSystem.Error value
 * close this context with it.
 *
 * Used in the context of a DirEntry.
 */
DomOpenContext.prototype.onDirError_ = function(error) {
  //this.onWamError_(wam.jsfs.dom.convertDirError(error, this.path));
};

DomOpenContext.prototype.onOpen_ = function() {
  var onFileError = this.onFileError_.bind(this);
  var mode = this.openContextBinding.mode;

  var onStat = function(stat) {
    this.entry_.file(function(f) {
        this.file_ = f;
        this.openContextBinding.ready(stat);
      }.bind(this),
      onFileError);
  }.bind(this);

  var onFileFound = function(entry) {
    this.entry_ = entry;
    if (mode.write && mode.truncate) {
      this.entry_.createWriter(
          function(writer) {
            writer.truncate(0);
            //wam.jsfs.dom.statEntry(entry, onStat, onFileError);
          },
          onFileError);
    } else {
      //wam.jsfs.dom.statEntry(entry, onStat, onFileError);
    }
  }.bind(this);

  this.domfs_.root.getFile(
      this.path,
      {create: mode.create,
       exclusive: mode.exclusive
      },
      onFileFound, onFileError);
};

/**
 * Handle a seek event from the binding.
 */
DomOpenContext.prototype.onSeek_ = function(arg) {
  this.seek_(arg).then(function(rv) {
    if (!rv)
      return Promise.reject();
    return Promise.resolve({position: this.position_});
  });
};

/**
 * Handle a read event from the binding.
 */
DomOpenContext.prototype.onRead_ = function(arg) {
  return new Promise(function(resolve, reject) {
    this.seek_(arg).then(function(rv) {
      if (!rv) {
        return reject();
      }
    
      var fileSize = this.file_.size;
      var end;
      if (arg.count) {
        end = this.position_ + arg.count;
      } else {
        end = fileSize;
      }

      var dataType = arg.dataType || 'utf8-string';
      var reader = new FileReader(this.entry_.file);

      reader.onload = function(e) {
        this.position_ = end + 1;
        var data = reader.result;

        if (dataType == 'base64-string') {
          // TODO: By the time we read this into a string the data may already have
          // been munged.  We need an ArrayBuffer->Base64 string implementation to
          // make this work for real.
          data = btoa(data);
        }
        return resolve({dataType: dataType, data: data});
      }.bind(this);

      reader.onerror = function(error) {
        //onError(wam.jsfs.dom.convertFileError(error, this.path));
      };

      var slice = this.file_.slice(this.position_, end);
      if (dataType == 'blob') {
        return resolve({dataType: dataType, data: slice});
      }   else if (dataType == 'arraybuffer') {
        reader.readAsArrayBuffer(slice);
      } else {
        reader.readAsText(slice);
      }
    });
  });
};

/**
 * Handle a write event from the binding.
 */
DomOpenContext.prototype.onWrite_ = function(arg) {

  return new Promise(function(resolve, reject) {
    var onWriterReady = function(writer) {
      var blob;
      if (arg.data instanceof Blob) {
        blob = arg.data;
      } else if (arg.data instanceof ArrayBuffer) {
        blob = new Blob([arg.data], {type: 'application/octet-stream'});
      } else if (arg.dataType == 'base64-string') {
        // TODO: Once we turn this into a string the data may already have
        // been munged.  We need an ArrayBuffer->Base64 string implementation to
        // make this work for real.
        blob = new Blob([atob(arg.data)],  {type: 'application/octet-stream'});
      } else if (arg.dataType == 'utf8-string') {
        blob = new Blob([arg.data],  {type: 'text/plain'});
      } else if (arg.dataType == 'value') {
        blob = new Blob([JSON.stringify(arg.data)],  {type: 'text/json'});
      }

      writer.onerror = function(error) {
        //onError(wam.jsfs.dom.convertFileError(error, this.path));
      }.bind(this);

      writer.onwrite = function() {
        this.position_ = this.position_ + blob.size;
        return resolve(null);
      }.bind(this);

      writer.seek(this.position_);
      writer.write(blob);
    };
    
    this.seek_(arg).then(function(rv) {
      if (!rv) {
        return reject();
      }
      this.entry_.createWriter(
          onWriterReady,
          this.onFileError_.bind(this),
          function(error) {
            //onError(wam.jsfs.dom.convertFileError(error, this.path));
          });
    }); 
  });
};
