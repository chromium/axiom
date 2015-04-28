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
import Path from 'axiom/fs/path';

import {getWhitespace} from 'wash/string_utils';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  if (cx.getArg('help')) {
    cx.stdout.write([
      'usage: mount [-t|--type <type>] [-n|--name <name>] [values]',
      'List mounted filesystems, or mount a new file system.',
      '',
      'If called with no arguments this command will list the current mounts.',
      '',
      'If the -t argument is provided, this will defer to a mount.<type>',
      'executable to mount a new file system.',
      '',
      'If -n is provided, it\'s passed to the mount.<type> command.',
      '',
      'If additional [values] are provided, they are passed to the',
      'mount.<type> command.',
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  if (cx.getArg('t')) {
    mountFileSystem_(cx);
  } else {
    listFileSystems_(cx);
  }
};

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
var listFileSystems_ = function(cx) {
  /** @type {FileSystemManager} */
  var fsm = cx.fileSystemManager;
  var fileSystems = fsm.getFileSystems();

  var rv = 'Mounted file systems:\n';
  var maxLength = 0;
  fileSystems.forEach(function(fileSystem) {
    if (fileSystem.rootPath.spec.length >= maxLength)
      maxLength = fileSystem.rootPath.spec.length;
  });

  fileSystems.forEach(function(fileSystem) {
    var spaces = getWhitespace(maxLength - fileSystem.rootPath.spec.length + 3);
    rv += fileSystem.rootPath.spec + spaces + '"' +
        fileSystem.description + '"' + '\n';
  });

  cx.stdout.write(rv);
  cx.closeOk(null);
};

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
var mountFileSystem_ = function(cx) {
  /** @type {string} */
  var fsType = cx.getArg('t');
  var fsMountCmd = new Path('jsfs:/exe/mount.' + fsType);

  var arg = {};
  var name = cx.getArg('name', null);
  if (name)
    arg['name'] = name;
  var values = cx.getArg('_', null);
  if (values)
    arg['_'] = values;

  cx.call(fsMountCmd, arg).then(function() {
    cx.closeOk();
  }).catch(function(err) {
    cx.closeError(err);
  });
};

main.signature = {
  'help|h': '?',
  'type|t': '$',
  'name|n': '$',
  '_': '@'
};

export default main;
