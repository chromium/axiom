// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'shell/environment';

/**
 * @constructor
 * An implementation of ace for editing files in an Axiom view.
 *
 * @param {string} filePath
 */
var EditorView = function(filePath) {

  EditorView.sequence++;
  this.id = 'editor-' + EditorView.sequence;
  this.filePath = filePath;

  var viewsBinding = environment.getServiceBinding('views@axiom');
  this.whenReady = viewsBinding.whenLoadedAndReady().then(function() {
      this.fileSystem_ = environment.getServiceBinding('filesystems@axiom');
      return this.fileSystem_.readFile(filePath, {read: true});
    }.bind(this)).then(function(data) {
      this.contents_ = data.data;
      return viewsBinding.register(this.id, 'div');
    }.bind(this)).then(function() {
      return viewsBinding.show(this.id);
    }.bind(this)).then(function(viewElem) {
      this.viewElem_ = viewElem;

      var ace = document.createElement('div');
      ace.className = 'editor';
      ace.style.cssText =
          'display: block; ' +
          'position: absolute; ' +
          'top: 0; ' +
          'left: 0; ' +
          'height: 100%; ' +
          'width: 100%; ' +
          'overflow: hidden;';
      this.viewElem_.appendChild(ace);

      this.editor = window.ace.edit(ace);

      this.editor.focus();
      this.editor.setTheme('ace/theme/monokai');
      this.editor.commands.addCommand({
        name: 'saveFile',
        bindKey: {
          win: 'Ctrl-S',
          mac: 'Command-S',
          sender: 'editor|cli'
        },
        exec: (function(env, args, request) {
          return this.fileSystem_.writeFile(filePath, {write: true},
              {data: this.editor.getSession().getValue()});
        }).bind(this)
      });

      this.displayContents_(this.contents_);
    }.bind(this));
};

export {EditorView};
export default EditorView;

EditorView.sequence = 0;

EditorView.prototype.displayContents_ = function(contents) {
  this.editor.getSession().setValue(contents, -1);
  this.editor.setReadOnly(false);
};

EditorView.prototype.displayData_ = function(data) {
  this.displayContents_(data.data);
};
