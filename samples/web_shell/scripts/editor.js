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

document.currentScript.ready(function(cx) {
  var EDITOR_CMD_USAGE_STRING = 'usage: edit <path>';

  /**
   * @return {void}
   */
  var editMain = function(cx) {
    cx.ready();

    /** @type {Array<string>} */
    var list = cx.getArg('_', []);
    if (list.length != 1 || cx.getArg('help')) {
      cx.stdout.write(EDITOR_CMD_USAGE_STRING + '\n');
      return cx.closeOk();
    }

    /** @type {string} */
    var pathSpec = list.shift();
    /** @type {string} */
    var pwd = cx.getPwd();

    /** @type {Editor} */
    var editor = new Editor(cx);
    editor.edit(axiom.fs.path.Path.abs(pwd, pathSpec)).then(function() {
      cx.closeOk();
    }).catch(function(e) {
      cx.closeError(e);
    });
  };

  editMain.signature = {
    'help|h': '?',
    '_': '@'
  };

  var installEditor = function(cx) {
    var path = new axiom.fs.path.Path('jsfs:/exe');
    var jsDir = cx.jsfs.resolve(path).entry;
    jsDir.install({
      'edit': editMain
    });
  };

  installEditor(cx);
});

/**
 * @constructor
 * Ace editor implementation for wash.
 *
 * @param {ExecuteContext} cx
 */
var Editor = function(cx) {
  /** @type {Path} The file to edit */
  this.path = null;

  /** @private @type {ExecuteContext} */
  this.cx_ = cx;

  /** @private @type {FileSystemManager} */
  this.fsm_ = cx.fileSystemManager;

  /** @private @type {Element} */
  this.editorWindow_ = null;
}

/**
 * Edit a file in a separate window.
 *
 * @param {Path} Path to file to edit
 * @return {Promise}
 */
Editor.prototype.edit = function(path) {
  this.path = path;

  return this.fsm_.readFile(this.path).then(function(contents) {
    return contents;
  }).catch(function(e) {
    if (axiom.core.error.AxiomError.NotFound.test(e)) {
      return this.fsm_.writeFile(this.path,
          axiom.fs.data_type.DataType.UTF8String, '').then(function() {
            return '';
          }.bind(this));
    }
    return Promise.reject(e);
  }.bind(this)).then(function (contents) {
    // TODO(ericarnold): This should all be handled in a setContents() (check
    // if editor has been instantiated, etc)
    this.contents_ = contents.data;

    window.onEditorWindowOpened = function() {
      this.editorWindow_.addEventListener('save',  function(evt) {
        // TODO(ericarnold): This may cause console errors about leaked Promise
        this.saveFile_(evt.target.getContents());
      }.bind(this));

      this.editorWindow_.addEventListener('ready',  function() {
        this.editorWindow_.setContents(this.contents_);
      }.bind(this));
    }.bind(this);

    this.editorWindow_ = window.open('scripts/resources/editor/index.html');
  }.bind(this));
}

/**
 * Saves the file being edited by the editor.
 *
 * @return {Promise}
 */
Editor.prototype.saveFile_ = function(contents) {
  this.contents_ = contents;
  return this.fsm_.writeFile(this.path, axiom.fs.data_type.DataType.UTF8String,
      contents);
}
