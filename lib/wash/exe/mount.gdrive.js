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
import GDriveFileSystem from 'axiom/fs/gdrive/file_system';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  if (document.location.protocol !== 'http:') {
    cx.closeError(new AxiomError.Incompatible(
        'connection protocol', 'gdrive file system requires HTTPS connection'));
    return;
  }

  cx.ready();

  if (cx.getArg('help')) {
    cx.stdout.write([
      'usage: mount.gdrive [-n|--name <name>]',
      'Mount a Google Drive file system.',
      '',
      'If -n is provided, it\'ll be used as the name of the new file system.',
      '',
      'This command will pop up a new window for authentication purposes.  ',
      'You may have to disable your popup blocker to see it.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  /** @type {!FileSystemManager} */
  var fsm = cx.fileSystemManager;
  GDriveFileSystem.mount(fsm, cx.getArg('name', 'gdrive'))
    .then(function() {
      cx.closeOk();
    })
    .catch(function(error) {
      cx.closeError(error);
    });
};

main.signature = {
  'help|h': '?',
  'name|n': '$'
};

export default main;
