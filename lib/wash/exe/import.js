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
import Path from 'axiom/fs/path';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * @constructor
 * Import a directory of files for use in wash.
 *
 * @param {JsExecuteContext} executeContext
 */
var ImportCommand = function(cx) {
  this.cx = cx;
  this.fsm = cx.fileSystemManager;

  var input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('webkitdirectory', '');
  input.setAttribute('multiple', 'webkitdirectory');
  input.style.cssText =
      'position: absolute;' +
      'right: 0';
  this.input = input;

  input.addEventListener('change', this._handleFileSelect.bind(this), false);

  document.body.appendChild(input);

  input.click();
};

ImportCommand.prototype._mkdirParent = function(path) {
  var parentPath = path.getParentPath();
  if (parentPath == null) return Promise.resolve(null);
  return this._mkdirParent(parentPath).then(function() {
    return this.fsm.mkdir(path).catch(function (e) {
      if (AxiomError.Duplicate.test(e)) {
        return Promise.resolve();
      }
    });
  }.bind(this));
}

/**
 * Handle the selection of a file on this.input
 *
 * @param {Event} evt
 */
ImportCommand.prototype._handleFileSelect = function(evt) {
  /**
   * @type {FileList}
   */
  var files = evt.target.files;

  var fileCount = 0;

  for (var i = 0, f; f = files[i]; i++) {
    var path = Path.abs(this.cx.getPwd(), f.webkitRelativePath);

    fileCount++;
    var reader = new FileReader();
    reader.onload = function(path, evt) {
      var fileContent = reader.result;
      console.log(path);
      var parentDirectory = path.getParentPath();
      return this.fsm.stat(parentDirectory).catch(function(e) {
        if (AxiomError.NotFound.test(e)) {
          return this._mkdirParent(parentDirectory);
        }
      }.bind(this)).then(function(result) {
        return this.fsm.writeFile(path, axiom.fs.data_type.DataType.Value,
            fileContent);
      }.bind(this)).then(function() {
        fileCount--;
        if (fileCount == 0) {
          document.body.removeChild(this.input);
          this.cx.closeOk();
        }
      }.bind(this, path));
    }.bind(this, path);

    reader.readAsBinaryString(f);
  }
};


/**
 * @param {JsExecuteContext} cx
 */
export var main = function(cx) {
  cx.ready();

  var command = new ImportCommand(cx);
};

export default main;

main.signature = {};
