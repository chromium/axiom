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
import Ephemeral from 'axiom/core/ephemeral';
import Path from 'axiom/fs/path';

/** @typedef Channel$$module$axiom$fs$stream$channel */
var Channel;

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef {StatResult$$module$axiom$fs$stat_result} */
var StatResult;

/**
 * Expose a file system implementation over a Channel.
 *
 * @constructor @extends {Ephemeral}
 * @param {!string} name
 * @param {!FileSystem} fileSystem
 * @param {!Channel} channel
 */
export var SkeletonFileSystem = function(name, fileSystem, channel) {
  Ephemeral.call(this);

  /** name of the remote file system */
  this.name_ = name;

  /** @const @private @type {!FileSystem} */
  this.fileSystem_ = fileSystem;

  /** @const @private @type {!Channel} */
  this.channel_ = channel;

  this.channel_.onRequest.addListener(this.onRequest_, this);
};

export default SkeletonFileSystem;

SkeletonFileSystem.prototype = Object.create(Ephemeral.prototype);

/**
 * @param {string} subject
 * @param {Object} request
 * @return {void}
 */
SkeletonFileSystem.prototype.onRequest_ = function(subject, request) {
  new Promise(
    function(resolve, reject) {
      this.processRequest(request).then(
        function(response) {
          resolve(response);
        }
      );
    }.bind(this)
  ).then(
    function(response) {
      console.log(1, response);
      this.channel_.sendResponse(subject, response);
    }.bind(this)
  ).catch(
    function(error) {
      console.log(2, error);
      this.channel_.sendResponse(subject, {error: error});
    }.bind(this)
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype.processRequest = function(request) {
  var cmd = request.cmd;
  if (cmd === 'list') {
    // TODO: Check file system names match.
    var path = new Path(request.path);
    var fsPath = this.fileSystem_.rootPath.combine(path.relSpec);
    return this.fileSystem_.list(fsPath).then(
      function(result) {
        return Promise.resolve({entries: result});
      }
    );
  } else {
    return Promise.reject(new AxiomError.Invalid('command', cmd));
  }
};
