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

import Completer from 'axiom/core/completer';
import Ephemeral from 'axiom/core/ephemeral';
import AxiomError from 'axiom/core/error';
import AxiomEvent from 'axiom/core/event';

import FileSystem from 'axiom/fs/base/file_system';

/**
 * @constructor @extends {Ephemeral<undefined>}
 *
 * A context that represents an open file on a FileSystem.
 *
 * You should only create an OpenContext by calling an instance of
 * FileSystemBinding..createContext('open', ...).
 *
 * @param {FileSystem} fileSystem The parent file system.
 * @param {string} pathSpec
 * @param {string|OpenContext.Mode} mode
 */
export var OpenContext = function(fileSystem, pathSpec, mode) {
  Ephemeral.call(this);

  /** @type {FileSystem} */
  this.fileSystem = fileSystem;

  /** @type {string} */
  this.pathSpec = pathSpec;

  if (typeof mode == 'string')
    mode = OpenContext.Mode.fromString(mode);

  /** @type {OpenContext.Mode} */
  this.mode = mode;

  // If the parent file system is closed, we close too.
  this.dependsOn(this.fileSystem);

  /**
   * @private @type {Completer}
   */
  this.openCompleter_ = null;
};

export default OpenContext;

OpenContext.prototype = Object.create(Ephemeral.prototype);

/** @enum {string} */
OpenContext.Whence = {
  Begin: 'begin',
  Current: 'current',
  End: 'end'
};

/** @constructor */
OpenContext.Mode = function() {
  this.create = false;
  this.exclusive = false;
  this.truncate = false;
  this.read = false;
  this.write = false;
};

/**
 * @param {string} str
 * @return {OpenContext.Mode}
 */
OpenContext.Mode.fromString = function(str) {
  var m = new OpenContext.Mode();

  for (var i = 0; i < str.length; i++) {
    switch(str.substr(i, 1)) {
      case 'c':
      m.create = true;
      break;

      case 'e':
      m.exclusive = true;
      break;

      case 't':
      m.truncate = true;
      break;

      case 'r':
      m.read = true;
      break;

      case 'w':
      m.write = true;
      break;
    }
  }

  return m;
};


/** @constructor */
OpenContext.ReadResult = function(offset, whence, dataType) {
  /** @type {number} */
  this.offset = offset;

  /** @type {OpenContext.Whence} */
  this.whence = whence;

  /** @type {OpenContext.DataType} */
  this.dataType = dataType;

  /** @type {*} */
  this.data = null;
};

/** @constructor */
OpenContext.WriteResult = function(offset, whence, dataType) {
  /** @type {number} */
  this.offset = offset;

  /** @type {OpenContext.Whence} */
  this.whence = whence;

  /** @type {OpenContext.DataType} */
  this.dataType = dataType;

  /** @type {*} */
  this.data = null;
};

/**
 * @enum {string}
 *
 * List of acceptable values for the 'dataType' parameter used in stat and read
 * operations.
 */
OpenContext.DataType = {
  /**
   * When a dataType of 'arraybuffer' is used on read and write requests, the
   * data is expected to be an ArrayBuffer instance.
   *
   * NOTE(rginda): ArrayBuffer objects don't work over chrome.runtime ports,
   * due to http://crbug.com/374454.
   */
  ArrayBuffer: 'arraybuffer',

  /**
   * When used in read and write requests, the data will be a base64 encoded
   * string.  Note that decoding this value to a UTF8 string may result in
   * invalid UTF8 sequences or data corruption.
   */
  Base64String: 'base64-string',

  /**
   * In stat results, a dataType of 'blob' means that the file contains a set
   * of random access bytes.
   *
   * When a dataType of 'blob' is used on a read request, the data is expected
   * to be an instance of an opened Blob object.
   *
   * NOTE(rginda): Blobs can't cross origin over chrome.runtime ports.
   * Need to test over HTML5 MessageChannels.
   */
  'Blob': 'blob',

  /**
   * Not used in stat results.
   *
   * When used in read and write requests, the data will be a UTF-8
   * string.  Note that if the underlying file contains sequences that cannot
   * be encoded in UTF-8, the result may contain invalid sequences or may
   * not match the actual contents of the file.
   */
  UTF8String: 'utf8-string',

  /**
   * In stat results, a dataType of 'value' means that the file contains a
   * single value which can be of any type.
   *
   * When an dataType of 'value' is used on a read request, the results of
   * the read will be the native type stored in the file.  If the file
   * natively stores a blob, the result will be a string.
   */
  Value: 'value'
};

/**
 * Initiate the open.
 *
 * Returns a promise that completes when the open is no longer valid.
 *
 * @return {!Promise<undefined>}
 */
OpenContext.prototype.open = function() {
  this.assertEphemeral('WAIT');
  return this.ephemeralPromise;
};

/**
 * @param {number} offset
 * @param {OpenContext.Whence} whence
 * @return {!Promise<undefined>}
 */
OpenContext.prototype.seek = function(offset, whence) {
  return Promise.resolve();
};

/**
 * @param {number} offset
 * @param {OpenContext.Whence} whence
 * @param {OpenContext.DataType} dataType
 * @return {!Promise<!OpenContext.ReadResult>}
 */
OpenContext.prototype.read = function(offset, whence, dataType) {
  if (!this.mode.read)
    return Promise.reject(new AxiomError.Invalid('mode.read', this.mode.read));

  return Promise.resolve(new OpenContext.ReadResult(offset, whence, dataType));
};

/**
 * @param {number} offset
 * @param {OpenContext.Whence} whence
 * @param {OpenContext.DataType} dataType
 * @return {!Promise<!OpenContext.WriteResult>}
 */
OpenContext.prototype.write = function(offset, whence, dataType) {
  if (!this.mode.write) {
    return Promise.reject(new AxiomError.Invalid('mode.write',
                                                 this.mode.write));
  }

  return Promise.resolve(new OpenContext.WriteResult(offset, whence, dataType));
};
