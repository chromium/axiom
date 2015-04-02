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

import FileSystem from 'axiom/fs/base/file_system';

/** @typedef Channel$$module$axiom$fs$stream$channel */
var Channel;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/**
 * Implementation of a remote FileSystem over a Channel.
 *
 * @constructor @extends {FileSystem}
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} name
 * @param {!Channel} channel
 */
export var ChannelFileSystem = function(fileSystemManager, name, channel) {
  FileSystem.call(this, fileSystemManager, name);

  /** @const @private @type {Channel} */
  this.channel_ = channel;

  /** @type {string} */
  this.description = 'remote file system';
};

export default ChannelFileSystem;

ChannelFileSystem.prototype = Object.create(FileSystem.prototype);
