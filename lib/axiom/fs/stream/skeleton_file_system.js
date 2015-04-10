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
 * @param {!string} description
 * @param {!FileSystem} fileSystem
 * @param {!Channel} channel
 */
export var SkeletonFileSystem = function(description, fileSystem, channel) {
  Ephemeral.call(this);

  /**
   * Instance description (for debugging/logging purposes)
   * @type {string }
   */
  this.description = description;

  /**
   * @type {?string} Name of the remote file system.
   */
  this.remoteName_ = null;

  /** @const @private @type {!FileSystem} */
  this.fileSystem_ = fileSystem;

  /** @const @private @type {!Channel} */
  this.channel_ = channel;

  this.channel_.onRequest.addListener(this.onRequest_, this);
};

export default SkeletonFileSystem;

SkeletonFileSystem.prototype = Object.create(Ephemeral.prototype);

/**
 * Convert a path from the remote peer to a path on the local file system.
 * @param {string} Path
 * @return {!Path}
 */
SkeletonFileSystem.prototype.convertPath_ = function(pathSpec) {
  var path = new Path(pathSpec);
  if (!path.isValid) {
    throw new AxiomError.Invalid('path', path.originalSpec);
  }

  if (path.root !== this.remoteName_) {
    throw new AxiomError.Invalid('path', path.originalSpec);
  }

  return this.fileSystem_.rootPath.combine(path.relSpec);
};

/**
 * @param {string} subject
 * @param {Object} request
 * @return {void}
 */
SkeletonFileSystem.prototype.onRequest_ = function(subject, request) {
  console.log('Processing request', request);
  new Promise(
    function(resolve, reject) {
      // Note: We run this inside a promise so that any exception thrown
      // can be caught in the "catch" at the end of this function.
      this.processRequest(request).then(resolve, reject);
    }.bind(this)
  ).then(
    function(response) {
      this.channel_.sendResponse(subject, response);
    }.bind(this)
  ).catch(
    function(error) {
      var errorToObject = function(err) {
        var plainObject = {};
        Object.getOwnPropertyNames(err).forEach(function(key) {
          plainObject[key] = err[key];
        });
        return plainObject;
      };
      var errorObj = errorToObject(error);
      console.log('Error processing request: ', errorObj);
      this.channel_.sendResponse(subject, {error: errorObj});
    }.bind(this)
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype.processRequest = function(request) {
  if (request.cmd === 'connect') {
    if (this.remoteName_) {
      throw new AxiomError.Runtime('Connection already established');
    }
    this.remoteName_ = request.name;
    return Promise.resolve();
  } else if (request.cmd === 'alias') {
    var pathFrom = this.convertPath_(request.pathFrom);
    var pathTo = this.convertPath_(request.pathTo);
    return this.fileSystem_.alias(pathFrom, pathTo);
  } else if (request.cmd === 'list') {
    var path = this.convertPath_(request.path);
    return this.fileSystem_.list(path).then(
      function(result) {
        return Promise.resolve({entries: result});
      }
    );
  } else if (request.cmd === 'stat') {
    var path = this.convertPath_(request.path);
    return this.fileSystem_.stat(path).then(
      function(result) {
        return Promise.resolve({statResult: result});
      }
    );
  } else if (request.cmd === 'mkdir') {
    var path = this.convertPath_(request.path);
    return this.fileSystem_.mkdir(path);
  } else {
    return Promise.reject(new AxiomError.Invalid('command', request.cmd));
  }
};
