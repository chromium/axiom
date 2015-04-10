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

import OpenContext from 'axiom/fs/base/open_context';

import JsEntry from 'axiom/fs/js/entry';
import JsValue from 'axiom/fs/js/value';

import Path from 'axiom/fs/path';

/** @typedef {DataType$$module$axiom$fs$data_type} */
var DataType;

/** @typedef {FileSystem$$module$axiom$fs$base$file_system} */
var FileSystem;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/** @typedef {OpenMode$$module$axiom$fs$open_mode} */
var OpenMode;

/** @typedef {ReadResult$$module$axiom$fs$read_result} */
var ReadResult;

/** @typedef {SeekWhence$$module$axiom$fs$seek_whence} */
var SeekWhence;

/** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
var StubFileSystem;

/** @typedef {WriteResult$$module$axiom$fs$write_result} */
var WriteResult;

/**
 * @constructor @extends {OpenContext}
 *
 * Construct a new context that can be used to open a file.
 *
 * @param {!StubFileSystem} fileSystem
 * @param {!Path} path
 * @param {string|OpenMode} mode
 */
export var StubOpenContext = function(fileSystem, path, mode) {
  OpenContext.call(this, fileSystem, path, mode);
  /**
   * @type {?string}
   */
  this.contextId_ = null;
  this.onClose.addListener(this.onClose_, this);
};

export default StubOpenContext;

StubOpenContext.prototype = Object.create(OpenContext.prototype);

/**
 * Initiate the open.
 *
 * Returns a promise that completes when the context is ready for
 * read/write/seek operations.
 *
 * Implementers are responsible for setting the "ready" state when
 * "open" is done.
 *
 * @override
 * @return {!Promise<undefined>}
 */
StubOpenContext.prototype.open = function() {
  // Open context on remote end.
  return this.fileSystem.sendRequest_({
      cmd: 'open-context-create',
      path: this.path.spec,
      mode: this.mode}).then(
    function(response) {
      this.contextId_ = response.contextId;
      this.ready();
    }.bind(this)
  );
};

/**
 * Returns a promise that completes when the "seek" operation is done.
 *
 * @override
 * @param {number} offset
 * @param {SeekWhence} whence
 * @return {!Promise<undefined>}
 */
StubOpenContext.prototype.seek = function(offset, whence) {
  return this.fileSystem.sendRequest_({
      cmd: 'open-context-seek',
      contextId: this.contextId_,
      offset: offset,
      whence: whence}).then(
    function(response) {
      return Promise.resolve();
    }
  );
};

/**
 * Returns a promise that completes when the "read" operation is done.
 *
 * @override
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} dataType
 * @return {!Promise<!ReadResult>}
 */
StubOpenContext.prototype.read = function(offset, whence, dataType) {
  return this.fileSystem.sendRequest_({
      cmd: 'open-context-read',
      contextId: this.contextId_,
      offset: offset,
      whence: whence,
      dataType: dataType}).then(
    function(/** {readResult: ReadResult} */response) {
      return Promise.resolve(response.readResult);
    }
  );
};

/**
 * Returns a promise that completes when the "write" operation is done.
 *
 * @override
 * @param {number} offset
 * @param {SeekWhence} whence
 * @param {?DataType} dataType
 * @param {*} data
 * @return {!Promise<!WriteResult>}
 */
StubOpenContext.prototype.write = function(offset, whence, dataType, data) {
  return this.fileSystem.sendRequest_({
      cmd: 'open-context-write',
      contextId: this.contextId_,
      offset: offset,
      whence: whence,
      dataType: dataType,
      data: data}).then(
    function(/** {writeResult: WriteResult} */response) {
      return Promise.resolve(response.writeResult);
    }
  );
};

/**
 * @return {void}
 */
StubOpenContext.prototype.onClose_ = function() {
  this.fileSystem.sendRequest_({
      cmd: 'open-context-close',
      contextId: this.contextId_}).then(
    function(response) {
      // TODO(rpaquay): What do we do here?
    }
  );
};
