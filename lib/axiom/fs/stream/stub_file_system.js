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
import FileSystem from 'axiom/fs/base/file_system';
import StubOpenContext from 'axiom/fs/stream/stub_open_context';

/** @typedef Channel$$module$axiom$fs$stream$channel */
var Channel;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/** @typedef {OpenContext$$module$axiom$fs$base$open_context} */
var OpenContext;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef {Path$$module$axiom$fs$path} */
var Path;

/** @typedef {StatResult$$module$axiom$fs$stat_result} */
var StatResult;

/**
 * Implementation of a FileSystem that forwards all request over a Channel
 * to a remote file system.
 *
 * @constructor @extends {FileSystem}
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} name
 * @param {!Channel} channel
 */
export var StubFileSystem = function(fileSystemManager, name, channel) {
  FileSystem.call(this, fileSystemManager, name);

  /** @const @private @type {Channel} */
  this.channel_ = channel;

  /** @type {string} */
  this.description = 'remote file system';
};

export default StubFileSystem;

StubFileSystem.prototype = Object.create(FileSystem.prototype);

/**
 * @private
 * @param {Path} path
 * @return {!boolean}
 */
StubFileSystem.prototype.isValidPath_ = function(path) {
  return !(!path || !path.isValid || path.root !== this.name);
};

/**
 * Send a request to the peer, returning a promise that completes when the
 * response is available.
 * @param {Object} request
 * @return {!Promise<Object>}
 */
StubFileSystem.prototype.sendRequest_ = function(request) {
  return this.channel_.sendRequest(request).then(
    function(response) {
      if (response && response.error)
        return Promise.reject(response.error);
      return response;
    }.bind(this)
  );
};

/**
 * @return {!Promise}
 */
StubFileSystem.prototype.connect = function() {
  return this.sendRequest_({
    cmd: 'connect',
    name: this.name
  });
};

/**
 * Create an alias from a path on this file system to a different path on this
 * file system.
 *
 * If the "from" path is on a different fs, we'll forward the call.  If "from"
 * is on this fs but "to" is not, the move will fail.
 *
 * The destination path must refer to a file that does not yet exist, inside a
 * directory that does.
 *
 * @override
 * @param {Path} pathFrom
 * @param {Path} pathTo
 * @return {!Promise<undefined>}
 */
StubFileSystem.prototype.alias = function(pathFrom, pathTo) {
  return this.sendRequest_({
    cmd: 'alias',
    pathFrom: pathFrom.spec,
    pathTo: pathTo.spec
  }).then(
    function(response) {
      return Promise.resolve();
    }
  );
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!Object<string, StatResult>>}
 */
StubFileSystem.prototype.list = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return this.sendRequest_({
    cmd: 'list',
    path: path.spec,
  }).then(
    function(response) {
      var result = {};
      for(var name in response.entries) {
        result[name] = response.entries[name];
      }
      return result;
    }.bind(this)
  );
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<!StatResult>}
 */
StubFileSystem.prototype.stat = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return this.sendRequest_({
    cmd: 'stat',
    path: path.spec,
  }).then(
    function(response) {
      return response.statResult;
    }.bind(this)
  );
};

/**
 * @override
 * @param {Path} path
 * @return {!Promise<undefined>}
 */
StubFileSystem.prototype.mkdir = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return this.sendRequest_({
    cmd: 'mkdir',
    path: path.spec,
  }).then(
    function(response) {
      return Promise.resolve();
    }
  );
};

/**
 * @override
 * @param {Path} path
 * @param {string|OpenMode} mode
 * @return {!Promise<!OpenContext>}
 */
StubFileSystem.prototype.createOpenContext = function(path, mode) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  // Open context on remote end.
  return this.sendRequest_({
      cmd: 'open-context.create',
      path: path.spec,
      mode: mode}).then(
    function(contextId) {
      /** @type {!OpenContext} */
      var cx = new StubOpenContext(this, path, mode, contextId);
      return Promise.resolve(cx);
    }.bind(this)
  );
};