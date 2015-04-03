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

import Ephemeral from 'axiom/core/ephemeral';

import Channel from 'axiom/fs/stream/channel';
import NodeWebSocketStreams from 'axiom/fs/stream/node_web_socket_streams';
import SkeletonFileSystem from 'axiom/fs/stream/skeleton_file_system';
import Transport from 'axiom/fs/stream/transport';

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/**
 * Expose a file system implementation over a Channel.
 *
 * @constructor @extends {Ephemeral}
 * @param {*} webSocket
 * @param {!FileSystem} fileSystem
 */
export var NodeSkeletonFileSystem = function(webSocket, fileSystem) {
  Ephemeral.call(this);

  /** @const @private @type {!*} */
  this.webSocket_ = webSocket;

  /** @const @private @type {!FileSystem} */
  this.fileSystem_ = fileSystem;

  this.streams_ = new NodeWebSocketStreams(webSocket);
  this.transport_ = new Transport(
      'NodeWebSocketTransport',
      this.streams_.readableStream,
      this.streams_.writableStream);
  this.channel_ = new Channel('NodeWebSocketChannel', this.transport_);
  this.skeleton_ = new SkeletonFileSystem('nodefs', fileSystem, this.channel_);
  this.streams_.resume();
};

export default NodeSkeletonFileSystem;

NodeSkeletonFileSystem.prototype = Object.create(Ephemeral.prototype);
