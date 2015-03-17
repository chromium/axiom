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
import DataType from 'axiom/fs/data_type';
import Path from 'axiom/fs/path';

var IMPORT_CMD_USAGE_STRING = 'usage: import [target]';

/** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
var ExecuteContext;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/**
 * @param {ExecuteContext} cx
 */
export var main = function(cx) {
  cx.ready();

  /** @type {Array<string>} */
  var list = cx.getArg('_', []);
  if (list.length > 1 || cx.getArg('help')) {
    cx.stdout.write(IMPORT_CMD_USAGE_STRING + '\n');
    return cx.closeOk();
  }

  /** @type {string} */
  var pathSpec = list.length ? list.shift() : '.';
  /** @type {string} */
  var pwd = cx.getPwd();
  /** @type {Path} */
  var path = Path.abs(pwd, pathSpec);

  /** @type {ImportCommand} */
  var command = new ImportCommand(cx);

  command.import(path);
};

export default main;

main.signature = {
  'help|h': '?',
  '_': '@'
};

/**
 * @constructor
 * Import a directory of files for use in wash.
 *
 * @param {ExecuteContext} executeContext
 */
var ImportCommand = function(cx) {
  /** @type {Path} The target directory of the import*/
  this.destination = null;

  /** @type {ExecuteContext} */
  this.cx_ = cx;

  /** @type {FileSystemManager} */
  this.fsm_ = cx.fileSystemManager;

  /** @type {Element} */
  this.input_ = null;
}

/**
 * Prompt the user to import a directory or file
 *
 * @param {Path} Destination path
 * @return {void}
 */
ImportCommand.prototype.import = function(destination) {
  this.destination = destination

  /** @type {Element} */
  var input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('webkitdirectory', '');
  input.setAttribute('multiple', 'webkitdirectory');
  input.style.cssText =
      'position: absolute;' +
      'right: 0';

  this.input_ = input;

  input.addEventListener('change', this.handleFileSelect_.bind(this), false);

  document.body.appendChild(input);

  input.click();
};

/**
 * Mkdir, including parent directories
 *
 * @param {Path} path
 * @return {Promise}
 */
ImportCommand.prototype.mkdirParent_ = function(path) {
  var parentPath = path.getParentPath();
  if (parentPath == null) return Promise.resolve(null);
  return this.mkdirParent_(parentPath).then(function() {
    return this.fsm_.mkdir(path).catch(function (e) {
      if (AxiomError.Duplicate.test(e)) {
        return Promise.resolve();
      }
      return Promise.reject(e);
    });
  }.bind(this));
}

/**
 * Handle the selection of a file on this.input_
 *
 * @param {Event} evt
 * @return {void}
 */
ImportCommand.prototype.handleFileSelect_ = function(evt) {
  /** @type {FileList} */
  var files = evt.target.files;

  /** @type {number} */
  var fileCount = 0;

  for (var i = 0, f; f = files[i]; i++) {
    var path = Path.abs(this.destination.spec, f.webkitRelativePath);

    fileCount++;
    var reader = new FileReader();
    reader.onload = function(path, evt) {
      var fileContent = reader.result;
      console.log(path);
      var parentDirectory = path.getParentPath();
      return this.fsm_.stat(parentDirectory).catch(function(e) {
        if (AxiomError.NotFound.test(e)) {
          return this.mkdirParent_(parentDirectory);
        }
        return Promise.reject(e);
      }.bind(this)).then(function(result) {
        return this.fsm_.writeFile(path, DataType.Value,
            fileContent);
      }.bind(this)).then(function() {
        fileCount--;
        if (fileCount == 0) {
          document.body.removeChild(this.input_);
          this.cx_.closeOk();
        }
      }.bind(this));
    }.bind(this, path);

    reader.readAsBinaryString(f);
  }
};
