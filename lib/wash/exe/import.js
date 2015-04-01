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
import Completer from 'axiom/core/completer';
import DataType from 'axiom/fs/data_type';
import Path from 'axiom/fs/path';

/** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
var ExecuteContext;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/**
 * @param {ExecuteContext} cx
 *
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  /** @type {Array<string>} */
  var list = cx.getArg('_', []);

  /** @type {boolean} */
  var forceSingleFile = cx.getArg('file');

  if (list.length > 1 || cx.getArg('help')) {
    cx.stdout.write([
      'usage: import [<target-directory>] [-d|--dialog [-f|--file]]',
      'Import a directory from the local file system.',
      '',
      'If <target-directory> is provided, the file(s) will be imported there.',
      'If not, they will be imported into the current directory.',
      '',
      'If -d is provided, a browser file-upload dialog is used instead of',
      'HTML5 drag-and-drop features.',
      '',
      'Imports a directory by default (if supported by browser).  If -f is',
      'provided, only a single file is imported.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  /** @type {string} */
  var pathSpec = list.length ? list.shift() : '.';
  /** @type {string} */
  var pwd = cx.getPwd();
  /** @type {Path} */
  var path = Path.abs(pwd, pathSpec);

  /** @type {ImportCommand} */
  var command = new ImportCommand(cx);

  // NOTE: cx will get closed in ImportCommand.prototype.handleFileSelect_().
  command.import(path, forceSingleFile);
};

export default main;

main.signature = {
  'dialog|d': '?',
  'file|f': '?',
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

  /** @private @type {ExecuteContext} */
  this.cx_ = cx;

  /** @private @type {FileSystemManager} */
  this.fsm_ = cx.fileSystemManager;

  /** @type {Element} An element which, if we return focus to it, will tell us
                      that the user has canceled the import. */
  this.dummyFocusInput_ = null;

  /** @type {Element} The file / directory chooser input. */
  this.input_ = null;

  /** @private @type {!boolean} Force import of single file*/
  this.singleFile_;

  /** @type {Element} The originally focused element to restore. */
  this.originalFocusElement_ = null;

  /** @type {boolean} Files have been selected (remove cancel handler). */
  this.filesChosen_ = false;

  /** @type {Element} Drop overlay for files */
  this.dropArea_ = null;

  // Localize the handlers so we can remove it later.
  this.handleFileCancel_ = this.handleFileCancel_.bind(this);
  this.handleUnresponsiveInput_ = this.handleUnresponsiveInput_.bind(this);
  this.handleDropCancel_ = this.handleDropCancel_.bind(this);
  this.handleDrop_ = this.handleDrop_.bind(this);
  this.handleDragOver_ = this.handleDragOver_.bind(this);
};

/**
 * Prompt the user to import a directory or file
 *
 * @param {Path} Destination path
 * @param {boolean} Import single file
 * @return {void}
 */
ImportCommand.prototype.import = function(destination, forceSingleFile) {
  this.destination = destination;
  this.singleFile_ = forceSingleFile;
  this.originalFocusElement_ = document.activeElement;
  this.dummyFocusInput_ = document.createElement('input');

  /** @type {Element} */
  this.dummyFocusInput_.setAttribute('type', 'text');
  document.body.appendChild(this.dummyFocusInput_);
  this.dummyFocusInput_.focus();

  /** @type {Element} */
  var input = document.createElement('input');
  input.setAttribute('type', 'file');
  if (!forceSingleFile) {
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('multiple', '');
  }
  
  input.style.cssText =
      'position: absolute;' +
      'right: 0';

  this.input_ = input;

  input.addEventListener('change', this.handleFileSelect_.bind(this), false);

  document.body.appendChild(input);

  if (false) {
    this.dummyFocusInput_.addEventListener('blur', this.handleUnresponsiveInput_, false);

    // input.click();


    // Cancellation is detected by creating a text field and giving it focus.
    // When the field gets focus again, and the `change` handler (above) hasn't
    // fired, we know that a cancel happened.
    this.dummyFocusInput_.addEventListener('focus', this.handleFileCancel_, false);
  } else {
    this.setOverlayVisible_(true);

  }
};

/**
 * Mkdir, including parent directories
 * @private
 * @param {Path} path
 * @return {Promise}
 */
ImportCommand.prototype.mkdirParent_ = function(path) {
  var parentPath = path.getParentPath();
  if (parentPath === null) return Promise.resolve(null);
  return this.mkdirParent_(parentPath).then(function() {
    return this.fsm_.mkdir(path).catch(function (e) {
      if (AxiomError.Duplicate.test(e)) {
        return Promise.resolve();
      }
      return Promise.reject(e);
    });
  }.bind(this));
};

/**
 * Set the overlay to visible or hidden.
 *
 * @private
 * @param {boolean} visible
 * @return {void}
 */
ImportCommand.prototype.setOverlayVisible_ = function(visible) {
  if ((this.dropArea_ !== null) == visible) return;

  var docElement = document.documentElement;
  var overlay = this.cx_.stdio.overlay;

  if (!visible) {
    overlay.removeChild(this.dropArea_);
    overlay.style.visibility = 'hidden';
  } else {
    overlay.style.visibility = 'visible';
    overlay.style.width = '100%';
    overlay.style.height = '100%';

    var dropArea = document.createElement('div');
    this.dropArea_ = dropArea;
    dropArea.style.border = '10px dashed #bbb';
    dropArea.style.width = 'calc(100% - 100px)';
    dropArea.style.height = 'calc(100% - 100px)';
    dropArea.style.borderRadius = '25px';
    dropArea.style.margin = '40px';
    overlay.appendChild(dropArea);

    var dropLabel = document.createElement('div');

    dropLabel.style.cssText = (
      'font: 47px arial, sans-serif;' +
      'color: #ddd;' +
      'height: 100%;' +
      'width: 100%;' +
      'text-align: center;' +
      /* Internet Explorer 10 */
      'display:-ms-flexbox;' +
      '-ms-flex-pack:center;' +
      '-ms-flex-align:center;' +
      /* Firefox */
      'display:-moz-box;' +
      '-moz-box-pack:center;' +
      '-moz-box-align:center;' +
      /* Safari, Opera, and Chrome */
      'display:-webkit-box;' +
      '-webkit-box-pack:center;' +
      '-webkit-box-align:center;' +
      /* W3C */
      'display:box;' +
      'box-pack:center;' +
      'box-align:center;');

    dropArea.appendChild(dropLabel);
    dropLabel.appendChild(document.createTextNode("Drop Files Here"));
    dropLabel.appendChild(document.createElement('br'));
    var cancelButton = document.createElement('span');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = (
      'border: 3px solid #ccc;' +
      'border-radius: 12px;' +
      'background: #222;' +
      'padding: 5px 10px 5px 10px;' +
      'cursor: default;' +
      'font-size: 24px;');
    dropLabel.appendChild(cancelButton);
    cancelButton.addEventListener('click', this.handleDropCancel_);
    dropArea.ondragover = this.handleDragOver_;
    dropArea.ondrop = this.handleDrop_;
  }
}

/**
 * Handle dropping of files for umport.
 *
 * @private
 * @param {Event} event
 * @return {void}
 */
ImportCommand.prototype.handleDragOver_ = function(event) {
  console.log("handleDragOver_");
  return false;
}



/**
 * Handle dropping of files for umport.
 *
 * @private
 * @param {Event} event
 * @return {void}
 */
ImportCommand.prototype.handleDrop_ = function(event) {
  console.log("handleDrop_");
  event.preventDefault && event.preventDefault();

  var files = event.dataTransfer.files;
  for (var i = 0; i < files.length; i++) {
    console.log('file ' + i + ' - ' + files[i]);
  }
  return false;
}

/**
 * Handle browsers which don't support .click() on the file input on keypress.
 *
 * @private
 * @param {Event} evt
 * @return {void}
 */
ImportCommand.prototype.handleUnresponsiveInput_ = function(evt) {
  if (document.activeElement.id == 'dummyInput') {
    this.editorWindow_ = window.open('scripts/resources/import/index.html');
  }

  this.dummyFocusInput_.removeEventListener('blur', this.handleUnresponsiveInput_, false);
}

/**
 * Handle the cancelation of drop overlay.
 *
 * @private
 * @param {Event} evt
 * @return {void}
 */
ImportCommand.prototype.handleDropCancel_ = function(evt) {
  this.setOverlayVisible_(false);
  this.handleFileCancel_(null);
}

/**
 * Handle the cancelation of choosing a file / directory.
 *
 * @private
 * @param {?Event} evt
 * @return {void}
 */
ImportCommand.prototype.handleFileCancel_ = function(evt) {
  // This handles a race condition between the cancel and select events which
  // cause spurious results This keeps things in the right order (100ms is
  // probably overkill, but mostly undetectable).
  setTimeout(function() {
    if (this.filesChosen_) return;
    this.destroy_();
    this.cx_.closeError(new AxiomError.Missing('file selection'));    
  }.bind(this), 100);
}

/**
 * Handle the selection of a file on this.input_
 *
 * @private
 * @param {Event} evt
 * @return {void}
 */
ImportCommand.prototype.handleFileSelect_ = function(evt) {
  this.filesChosen_ = true;

  /** @type {FileList} */
  var files = evt.target.files;

  /** @type {!Array<Promise>} */
  var copyPromises = [];

  var onFileLoad = function(data, evt) {
    /** @type {ArrayBuffer|Blob|string} */
    var fileContent = evt.target.result;

    /** @type {Path} */
    var path = data.path;

    /** @type {Completer} */
    var fileCompleter = data.completer;

    var parentDirectory = path.getParentPath();
    this.fsm_.stat(parentDirectory).catch(function(e) {
      if (AxiomError.NotFound.test(e)) {
        return this.mkdirParent_(parentDirectory);
      }
      return Promise.reject(e);
    }.bind(this)).then(function(result) {
      return this.fsm_.writeFile(path, DataType.Value, fileContent);
    }.bind(this)).then(function() {
      fileCompleter.resolve(null);
    }.bind(this)).catch(function(e) {
      fileCompleter.resolve(e);
    });
  };

  for (var i = 0; i < files.length; i++) {
    /** @type {!File} */
    var f = files[i];

    /** @type {string} */
    var relativePath =
        /** @type {!{webkitRelativePath: string}} */(f).webkitRelativePath

    if (relativePath === undefined || this.singleFile_) {
      relativePath = /** @type {{name: string}} */(f).name;
    }

    var path = Path.abs(this.destination.spec, relativePath);

    var reader = new FileReader();

    /** @type {Completer} */
    var fileCompleter = new Completer();

    /** @type {{path:Path, completer:Completer}} */
    var data = {
      path: path,
      completer: fileCompleter
    };

    reader.onload = onFileLoad.bind(this, data);

    copyPromises.push(fileCompleter.promise);

    reader.readAsBinaryString(f);
  }

  Promise.all(copyPromises).then(function (values) {
    this.destroy_();

    /** @type {Array<Error>} */
    var errors = values.filter(function(element) { return element !== null; });

    if (errors.length === 0) {
      this.cx_.closeOk();
    } else {
      this.cx_.closeError(new AxiomError.Unknown(errors));
    }
  }.bind(this));
};

/**
 * Cleanup after command finishes
 *
 * @private
 * @return {void}
 */
ImportCommand.prototype.destroy_ = function() {
  document.body.removeChild(this.input_);
  document.body.removeChild(this.dummyFocusInput_);

  // TODO(umop): Fix focus issue
  // Return focus to the `activeElement` which is the iframe with `hterm` in it.
  // This causes the cursor to lose its focus style (hollow cursor instead of
  // block cursor), but does not actually cause the terminal to lose focus.
  this.originalFocusElement_.focus();
}
