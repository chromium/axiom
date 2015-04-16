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
import SkeletonStdio from 'axiom/fs/stream/skeleton_stdio';
import SkeletonReadableStream from 'axiom/fs/stream/skeleton_readable_stream';
import SkeletonWritableStream from 'axiom/fs/stream/skeleton_writable_stream';

/** @typedef Channel$$module$axiom$fs$stream$channel */
var Channel;

/** @typedef {ExecuteContext$$module$axiom$fs$base$execute_context} */
var ExecuteContext;

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef {OpenContext$$module$axiom$fs$base$open_context} */
var OpenContext;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef {StatResult$$module$axiom$fs$stat_result} */
var StatResult;

/** @typedef Stdio$$module$axiom$fs$stdio */
var Stdio;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

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

  /** @type {!Object<!string, !OpenContext>}  */
  this.openContexts_ = {};

  /** @type {!Object<!string, !ExecuteContext>}  */
  this.executeContexts_ = {};

  /** @type {!Object<!string, !SkeletonReadableStream>}  */
  this.readableStreams_ = {};

  /** @type {!Object<!string, !SkeletonWritableStream>}  */
  this.writableStreams_ = {};

  /** @type {!number} */
  this.nextContextId_ = 0;

  /** @type {!number} */
  this.nextStreamId_ = 0;
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
  //console.log('Processing request ' + subject + ': ', request);
  new Promise(
    function(resolve, reject) {
      // Note: We run this inside a promise so that any exception thrown
      // can be caught in the "catch" at the end of this function.
      this.processRequest(request).then(resolve, reject);
    }.bind(this)
  ).then(
    function(response) {
      //console.log('Response ' + subject + ': ', response);
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
      console.error('Error processing request ' + subject + ': ', errorObj);
      this.channel_.sendResponse(subject, {error: errorObj});
    }.bind(this)
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype.processRequest = function(request) {
  if (request.cmd in this) {
    return this[request.cmd](request);
  } else {
    return Promise.reject(new AxiomError.Invalid('command', request.cmd));
  }
};

/**
 * Send a request to the peer, returning a promise that completes when the
 * response is available.
 * @param {Object} request
 * @return {!Promise<Object>}
 */
SkeletonFileSystem.prototype.sendRequest = function(request) {
  return this.channel_.sendRequest(request).then(
    function(response) {
      if (response && response.error)
        return Promise.reject(response.error);
      return response;
    }.bind(this)
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['connect'] = function(request) {
  if (this.remoteName_) {
    throw new AxiomError.Runtime('Connection already established');
  }
  this.remoteName_ = request.name;
  return Promise.resolve();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['alias'] = function(request) {
  var pathFrom = this.convertPath_(request.pathFrom);
  var pathTo = this.convertPath_(request.pathTo);
  return this.fileSystem_.alias(pathFrom, pathTo);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['list'] = function(request) {
  var path = this.convertPath_(request.path);
  return this.fileSystem_.list(path).then(
    function(result) {
      return Promise.resolve({entries: result});
    }
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['stat'] = function(request) {
  var path = this.convertPath_(request.path);
  return this.fileSystem_.stat(path).then(
    function(result) {
      return Promise.resolve({statResult: result});
    }
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['mkdir'] = function(request) {
  var path = this.convertPath_(request.path);
  return this.fileSystem_.mkdir(path);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['unlink'] = function(request) {
  var path = this.convertPath_(request.path);
  return this.fileSystem_.unlink(path);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['copy'] = function(request) {
  var fromPath = this.convertPath_(request.fromPath);
  var toPath = this.convertPath_(request.toPath);
  return this.fileSystem_.copy(fromPath, toPath);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['move'] = function(request) {
  var fromPath = this.convertPath_(request.fromPath);
  var toPath = this.convertPath_(request.toPath);
  return this.fileSystem_.move(fromPath, toPath);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['open-context.create'] = function(request) {
  var path = this.convertPath_(request.path);
  var mode = request.mode;
  return this.fileSystem_.createOpenContext(path, mode).then(
    function(cx) {
      this.nextContextId_++;
      /** @type {!string} */
      var contextId = this.nextContextId_.toString();
      this.openContexts_[contextId] = cx;
      return Promise.resolve(contextId);
    }.bind(this)
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['open-context.open'] = function(request) {
  var contextId = request.contextId;
  var cx = this.openContexts_[contextId];
  if (!cx) {
    return Promise.reject(
      new AxiomError.Invalid('open-context-id', contextId));
  }
  return cx.open();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['open-context.close'] = function(request) {
  var contextId = request.contextId;
  var closeReason = request.closeReason;
  var closeValue = request.closeValue;
  var cx = this.openContexts_[contextId];
  if (!cx) {
    return Promise.reject(
      new AxiomError.Invalid('open-context-id', contextId));
  }
  delete this.openContexts_[contextId];
  if (!closeReason || closeReason === 'ok') {
    cx.closeOk(closeValue);
  } else {
    cx.closeError(closeValue);
  }
  return Promise.resolve();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['open-context.seek'] = function(request) {
  var contextId = request.contextId;
  var offset = request.offset;
  var whence = request.whence;
  var cx = this.openContexts_[contextId];
  if (!cx) {
    return Promise.reject(
      new AxiomError.Invalid('open-context-id', contextId));
  }
  return cx.seek(offset, whence);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['open-context.read'] = function(request) {
  var contextId = request.contextId;
  var offset = request.offset;
  var whence = request.whence;
  var dataType = request.dataType;
  var cx = this.openContexts_[contextId];
  if (!cx) {
    return Promise.reject(
      new AxiomError.Invalid('open-context-id', contextId));
  }
  return cx.read(offset, whence, dataType);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['open-context.write'] = function(request) {
  var contextId = request.contextId;
  var offset = request.offset;
  var whence = request.whence;
  var dataType = request.dataType;
  var data = request.data;
  var cx = this.openContexts_[contextId];
  if (!cx) {
    return Promise.reject(
      new AxiomError.Invalid('open-context-id', contextId));
  }
  return cx.write(offset, whence, dataType, data);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['execute-context.create'] = function(request) {
  var path = this.convertPath_(request.path);
  var streams = request.streams;
  var arg = request.arg;
  return this.createSkeletonStdio_(streams).then(
    function(skeletonStdio) {
      return this.fileSystem_.createExecuteContext(
          path, skeletonStdio.getStdio(), arg).then(
        function(cx) {
          this.nextContextId_++;
          /** @type {!string} */
          var contextId = this.nextContextId_.toString();
          this.executeContexts_[contextId] = cx;
          skeletonStdio.dependsOn(cx);
          return Promise.resolve(contextId);
        }.bind(this)
      );
    }.bind(this)
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['execute-context.execute'] = function(request) {
  var contextId = request.contextId;
  var cx = this.executeContexts_[contextId];
  if (!cx) {
    return Promise.reject(
      new AxiomError.Invalid('open-context-id', contextId));
  }
  return cx.execute();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['execute-context.close'] = function(request) {
  var contextId = request.contextId;
  var closeReason = request.closeReason;
  var closeValue = request.closeValue;
  var cx = this.executeContexts_[contextId];
  if (!cx) {
    return Promise.reject(
      new AxiomError.Invalid('open-context-id', contextId));
  }
  delete this.executeContexts_[contextId];
  if (cx.isEphemeral('Wait', 'Ready')) {
    if (!closeReason || closeReason === 'ok') {
      cx.closeOk(closeValue);
    } else {
      cx.closeError(closeValue);
    }
  }
  return Promise.resolve();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['readable-stream.create'] = function(request) {
  this.nextStreamId_++;
  /** @type {!string} */
  var streamId = this.nextStreamId_.toString();
  var stream = new SkeletonReadableStream(this, streamId);
  this.readableStreams_[streamId] = stream;
  return Promise.resolve(streamId);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['readable-stream.close'] = function(request) {
  var streamId = request.streamId;
  var closeReason = request.closeReason;
  var closeValue = request.closeValue;
  var stream = this.readableStreams_[streamId];
  if (!stream) {
    return Promise.reject(
      new AxiomError.Invalid('readable-stream-id', streamId));
  }
  delete this.readableStreams_[streamId];
  if (!closeReason || closeReason === 'ok') {
    stream.closeOk(closeValue);
  } else {
    stream.closeError(closeValue);
  }
  return Promise.resolve();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['writable-stream.create'] = function(request) {
  this.nextStreamId_++;
  /** @type {!string} */
  var streamId = this.nextStreamId_.toString();
  var stream = new SkeletonWritableStream(this, streamId);
  this.writableStreams_[streamId] = stream;
  return Promise.resolve(streamId);
};

/**
 * @param {Object} request
 * @return {Promise}
 */
SkeletonFileSystem.prototype['writable-stream.close'] = function(request) {
  var streamId = request.streamId;
  var closeReason = request.closeReason;
  var closeValue = request.closeValue;
  var stream = this.writableStreams_[streamId];
  if (!stream) {
    return Promise.reject(
      new AxiomError.Invalid('writable-stream-id', streamId));
  }
  delete this.writableStreams_[streamId];
  if (!closeReason || closeReason === 'ok') {
    stream.closeOk(closeValue);
  } else {
    stream.closeError(closeValue);
  }
  return Promise.resolve();
};

/**
 * @param {!Object<!string, !string>} streams
 * @return {!Promise<!SkeletonStdio>}
 */
SkeletonFileSystem.prototype.createSkeletonStdio_ = function(streams) {
  var stdio = new SkeletonStdio();
  for(var name in streams) {
    var id = streams[name];

    var readableStream = this.readableStreams_[id];
    if (readableStream) {
      stdio.readableStreams[name] = readableStream;
    }
    var writableStream = this.writableStreams_[id];
    if (writableStream) {
      stdio.writableStreams[name] = writableStream;
    }
  }

  return Promise.resolve(stdio);
};
