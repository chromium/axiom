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
import FileSystem from 'axiom/fs/base/file_system';
import StubOpenContext from 'axiom/fs/stream/stub_open_context';
import StubExecuteContext from 'axiom/fs/stream/stub_execute_context';
import Arguments from 'axiom/fs/arguments';
import AxiomStream from 'axiom/fs/stream/axiom_stream';
import StubStdio from 'axiom/fs/stream/stub_stdio';
import StubReadableStream from 'axiom/fs/stream/stub_readable_stream';
import StubWritableStream from 'axiom/fs/stream/stub_writable_stream';

/** @typedef Channel$$module$axiom$fs$stream$channel */
var Channel;

/** @typedef {ExecuteContext$$module$axiom$fs$base$execute_context} */
var ExecuteContext;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/** @typedef {OpenContext$$module$axiom$fs$base$open_context} */
var OpenContext;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef {Path$$module$axiom$fs$path} */
var Path;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef {StatResult$$module$axiom$fs$stat_result} */
var StatResult;

/** @typedef Stdio$$module$axiom$fs$stdio */
var Stdio;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

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
  this.channel_.onRequest.addListener(this.onChannelRequest_, this);
  this.channel_.onClose.addListener(this.onChannelClose_, this);

  /** @type {string} */
  this.description = 'stream file system';

  /** @type {!Object<!string, !StubReadableStream>} */
  this.readableStreams_ = {};

  /** @type {!Object<!string, !StubWritableStream>} */
  this.writableStreams_ = {};

  this.onClose.addListener(function(reason, value) {
    this.sendRequest_({
      cmd: 'disconnect',
      reason: reason,
      value: value
    });
  }.bind(this));
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
 * corresponding response is available.
 *
 * @param {Object} request
 * @return {!Promise<Object>}
 */
StubFileSystem.prototype.sendRequest_ = function(request) {
  return this.channel_.sendRequest(request).then(
    function(response) {
      if (response && response.error)
        return Promise.reject(AxiomError.fromObject(response.error));
      return response;
    }.bind(this)
  );
};

/**
 * @return {void}
 */
StubFileSystem.prototype.onChannelClose_ = function(subject, request) {
  if (this.isEphemeral('Ready')) {
    this.closeOk();
  }
};

/**
 * @return {!Promise}
 */
StubFileSystem.prototype.connect = function() {
  return this.sendRequest_({
    cmd: 'connect',
    name: this.name
  }).then(
    function(){
      this.ready();
    }.bind(this)
  );
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
 * Copy an entry from a path on a file system to a different path on the
 * same file system.
 *
 * The destination path must refer to a file that does not yet exist, inside a
 * directory that does.
 *
 * @override
 * @param {Path} fromPath
 * @param {Path} toPath
 * @return {!Promise<undefined>}
 */
StubFileSystem.prototype.copy = function(fromPath, toPath) {
  if (!this.isValidPath_(fromPath)) {
    return Promise.reject(
        new AxiomError.Invalid('fromPath', fromPath.originalSpec));
  }

  if (!this.isValidPath_(toPath)) {
    return Promise.reject(
        new AxiomError.Invalid('toPath', toPath.originalSpec));
  }

  if (fromPath.root !== toPath.root) {
    return FileSystem.prototype.copy.call(this, fromPath, toPath);
  }

  return this.sendRequest_({
    cmd: 'copy',
    fromPath: fromPath.spec,
    toPath: toPath.spec
  }).then(
    function(response) {
      return Promise.resolve();
    }
  );
};

/**
 * Move an entry from a path on a file system to a different path on the
 * same file system.
 *
 * The destination path must refer to a file that does not yet exist, inside a
 * directory that does.
 *
 * @override
 * @param {Path} fromPath
 * @param {Path} toPath
 * @return {!Promise<undefined>}
 */
StubFileSystem.prototype.move = function(fromPath, toPath) {
  if (!this.isValidPath_(fromPath)) {
    return Promise.reject(
        new AxiomError.Invalid('fromPath', fromPath.originalSpec));
  }

  if (!this.isValidPath_(toPath)) {
    return Promise.reject(
        new AxiomError.Invalid('toPath', toPath.originalSpec));
  }

  if (fromPath.root !== toPath.root) {
    return FileSystem.prototype.move.call(this, fromPath, toPath);
  }

  return this.sendRequest_({
    cmd: 'move',
    fromPath: fromPath.spec,
    toPath: toPath.spec
  }).then(
    function(response) {
      return Promise.resolve();
    }
  );
};

/**
 * Remove the given path.
 *
 * @override
 * @param {Path} path
 * @return {Promise}
 */
StubFileSystem.prototype.unlink = function(path) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return this.sendRequest_({
    cmd: 'unlink',
    path: path.spec,
  }).then(
    function(response) {
      return Promise.resolve();
    }
  );
};

/**
 * Installs an object of callback executables into /exe.
 *
 * @override
 * @param {Object<string, function(JsExecuteContext)>} executables
 * @return {void}
 */
StubFileSystem.prototype.install = function(obj) {
  throw new AxiomError.NotImplemented(
      'Cannot install executables into a streamed file system.');
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

/**
 * @param {!Path} path
 * @param {!Stdio} stdio
 * @param {Object|Arguments} arg
 * @return {!Promise<!ExecuteContext>}
 */
StubFileSystem.prototype.createExecuteContext = function(path, stdio, arg) {
  if (!this.isValidPath_(path))
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  return this.createStubStdio_(stdio).then(
    function(stubStdio) {
      /** Object */
      var argObject = (arg instanceof Arguments) ? arg.toObject() : arg;

      // Open context on remote end.
      return this.sendRequest_({
          cmd: 'execute-context.create',
          path: path.spec,
          streams: stubStdio.getStreams(),
          arg: argObject}).then(
        function(contextId) {
          // TODO(rpaquay): Create actual arguments?
          var args = new Arguments({}, {});
          /** @type {!ExecuteContext} */
          var cx = new StubExecuteContext(
              this, stubStdio.getStdio(), path, args, contextId);
          stubStdio.dependsOn(cx);
          return Promise.resolve(cx);
        }.bind(this)
      );
    }.bind(this)
  );
};

/**
 * @param {!StubExecuteContext} executeContext
 * @param {!Stdio} stdio
 * @return {!Promise<!StubStdio>}
 */
StubFileSystem.prototype.createStubStdio_ = function(stdio) {
  var stubStdio = new StubStdio(stdio);
  var promises = [];
  for(var key in stdio) {
    var stream = stdio[key];
    if (AxiomStream.isWritable(stream)) {
      var promise = this.createStubWritableStream_(stubStdio, key, stream);
      promises.push(promise);
    } else if (AxiomStream.isReadable(stream)) {
      var promise = this.createStubReableStream_(stubStdio, key, stream);
      promises.push(promise);
    }
  }

  // TODO(rpaquay): Error handing: If not all promises succeed, how do we close
  // the streams that have successfully been created?
  return Promise.all(promises).then(function() {
    return stubStdio;
  });
};

/**
 * @param {!StubStdio} stubStdio
 * @param {!string} streamName
 * @param {!WritableStream} stream
 * @return {!Promise<void>}
 */
StubFileSystem.prototype.createStubWritableStream_ =
    function(stubStdio, streamName, stream) {

  return this.sendRequest_({cmd: 'writable-stream.create'}).then(
    function(streamId) {
      var stubStream =
          new StubWritableStream(this, stream, streamName, streamId);
      this.writableStreams_[streamId] = stubStream;
      stubStream.onClose.addListener(function() {
        delete this.writableStreams_[streamId];
      }.bind(this));
      stubStdio.writableStreams[streamName] = stubStream;
      stubStream.dependsOn(stubStdio);
      return Promise.resolve();
    }.bind(this)
  );
};

/**
 * @param {!StubStdio} stubStdio
 * @param {!string} streamName
 * @param {!ReadableStream} stream
 * @return {!Promise<void>}
 */
StubFileSystem.prototype.createStubReableStream_ =
    function(stubStdio, streamName, stream) {

  return this.sendRequest_({cmd: 'readable-stream.create'}).then(
    function(streamId) {
      var stubStream =
          new StubReadableStream(this, stream, streamName, streamId);
      this.readableStreams_[streamId] = stubStream;
      stubStream.onClose.addListener(function() {
        delete this.readableStreams_[streamId];
      }.bind(this));
      stubStdio.readableStreams[streamName] = stubStream;
      stubStream.dependsOn(stubStdio);
      return Promise.resolve();
    }.bind(this)
  );
};

/**
 * @param {string} subject
 * @param {Object} request
 * @return {void}
 */
StubFileSystem.prototype.onChannelRequest_ = function(subject, request) {
  // TODO(rpaquay): This is a copy of SkeletonFileSystem.onRequest_
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
      console.error('Error processing request ' + subject + ': ', error);
      /** @type {AxiomError} */
      var axiomError = (error instanceof AxiomError)
        ? error
        : new AxiomError.Runtime(error);
      this.channel_.sendResponse(subject, {error: axiomError.toObject()});
    }.bind(this)
  );
};

/**
 * @param {Object} request
 * @return {Promise}
 */
StubFileSystem.prototype.processRequest = function(request) {
  // TODO(rpaquay): This is a copy of SkeletonFileSystem.processRequest
  var functionName = 'handler:' + request.cmd;
  if (functionName in this) {
    return this[functionName](request);
  } else {
    return Promise.reject(new AxiomError.Invalid('command', request.cmd));
  }
};

/**
 * @param {Object} request
 * @return {Promise}
 */
StubFileSystem.prototype['handler:writable-stream.write'] = function(request) {
  var streamId = request.streamId;
  var value = request.value;
  var stream = this.writableStreams_[streamId];
  if (!stream) {
    return Promise.reject(
      new AxiomError.Invalid('writable-stream-id', streamId));
  }

  return new Promise(function(resolve, reject) {
    // TODO(rpaquay): Error detection?
    stream.write(value, function() {
      resolve();
    });
  });
};

/**
 * @param {Object} request
 * @return {Promise}
 */
StubFileSystem.prototype['handler:writable-stream.end'] = function(request) {
  var streamId = request.streamId;
  var stream = this.writableStreams_[streamId];
  if (!stream) {
    return Promise.reject(
      new AxiomError.Invalid('writable-stream-id', streamId));
  }

  stream.end();
  return Promise.resolve();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
StubFileSystem.prototype['handler:readable-stream.pause'] = function(request) {
  var streamId = request.streamId;
  var stream = this.readableStreams_[streamId];
  if (!stream) {
    return Promise.reject(
      new AxiomError.Invalid('readable-stream-id', streamId));
  }
  stream.pause();
  return Promise.resolve();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
StubFileSystem.prototype['handler:readable-stream.resume'] = function(request) {
  var streamId = request.streamId;
  var stream = this.readableStreams_[streamId];
  if (!stream) {
    return Promise.reject(
      new AxiomError.Invalid('readable-stream-id', streamId));
  }
  stream.resume();
  return Promise.resolve();
};

/**
 * @param {Object} request
 * @return {Promise}
 */
StubFileSystem.prototype['handler:readable-stream.read'] = function(request) {
  var streamId = request.streamId;
  var stream = this.readableStreams_[streamId];
  if (!stream) {
    return Promise.reject(
      new AxiomError.Invalid('readable-stream-id', streamId));
  }
  var value = stream.read();
  return Promise.resolve(value);
};
