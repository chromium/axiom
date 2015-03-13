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

import GDriveFileSystem from 'axiom/fs/gdrive/file_system';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

var MOUNT_GDRIVE_CMD_USAGE_STRING = 'usage: mount.gdrive\n';

/**
 * @param {JsExecuteContext} cx
 * @return {!Promise<*>}
 */
export var main = function(cx) {
  cx.ready();

  if (cx.getArg('_', []).length > 0 || cx.getArg('help')) {
    cx.stdout.write(MOUNT_GDRIVE_CMD_USAGE_STRING);
    return cx.closeOk();
  }

  /** @type {!FileSystemManager} */
  var fsm = cx.fileSystemManager;
  return GDriveFileSystem.mount(fsm, 'gdrive')
    .catch(function(error) {
      return cx.closeError(error);
    })
    .then(function() {
      return cx.closeOk(null);
    });
};

main.signature = {
  'help|h': '?',
  '_': '@'
};

export default main;
