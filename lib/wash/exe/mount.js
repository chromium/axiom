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

import {getWhitespace} from 'wash/string_utils';

/** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
var ExecuteContext;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

var fileSystemStates_ = {};
// NOTE: padded on the right to be equal width.
fileSystemStates_[Ephemeral.State.Wait] =   'registered';
fileSystemStates_[Ephemeral.State.Ready] =  'mounted   ';
fileSystemStates_[Ephemeral.State.Error] =  'error     ';
fileSystemStates_[Ephemeral.State.Closed] = 'closed    ';

/**
 * @param {ExecuteContext} cx
 * @return {!Promise<undefined>}
 */
export var main = function(cx) {
  cx.ready();

  /** @type {Array<string>} */
  var fileSystemName = cx.getArg('_');

  if (fileSystemName)
    return mountFileSystem_(cx, fileSystemName);
  else
    return listFileSystems_(cx);
};

/**
 * @param {ExecuteContext} cx
 * @return {!Promise<undefined>}
 */
var listFileSystems_ = function(cx) {
  /** @type {FileSystemManager} */
  var fsm = cx.fileSystemManager;

  var fileSystems = fsm.getFileSystems();

  var rv = 'File systems:\n';
  var maxLength = 0;
  fileSystems.forEach(function(fileSystem) {
    if (fileSystem.rootPath.spec.length >= maxLength)
      maxLength = fileSystem.rootPath.spec.length;
  });

  fileSystems.forEach(function(fileSystem) {
    var spaces = getWhitespace(maxLength - fileSystem.rootPath.spec.length + 3);
    rv += fileSystem.rootPath.spec + spaces +
        fileSystemStates_[fileSystem.getState()] +
        '    "' + fileSystem.description + '"' + '\n';
  });

  cx.stdout.write(rv);
  return cx.closeOk(null);
};

/**
 * @param {ExecuteContext} cx
 * @param {string} fileSystemName
 * @return {!Promise<undefined>}
 */
var mountFileSystem_ = function(cx, fileSystemName) {
  /** @type {FileSystemManager} */
  var fsm = cx.fileSystemManager;
  return fsm.mount(fileSystemName).then(function() {
    return cx.closeOk(null);
  });
};

main.signature = {
  '_': '@'
};

export default main;
