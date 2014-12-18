// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'axiom_shell/environment';

export var EditorView = function(filePath) {
  EditorView.sequence++;
  this.id = 'editor-' + EditorView.sequence;

  var viewsBinding = environment.getServiceBinding('views@axiom');
  this.whenReady = viewsBinding.whenLoadedAndReady().then(function() {
      return viewsBinding.register(this.id, 'div');
    }.bind(this)).then(function() {
      return viewsBinding.show(this.id);
    }.bind(this)).then(function(viewElem) {
      this.viewElem_ = viewElem;

      var object = document.createElement('object');
      object.style.cssText = (
          'display: block; ' +
          'position: absolute; ' +
          'top: 0; ' +
          'left: 0; ' +
          'height: 100%; ' +
          'width: 100%; ' +
          'overflow: hidden; ' +
          'pointer-events: none;');

      var onResize = function() {
        console.log('onResize!');
      }.bind(this);

      object.onload = function() {
        console.log('onload!');
        this.contentDocument.defaultView.addEventListener(
            'resize', onResize);
        onResize();
      };

      object.type = 'text/html';
      object.data = 'about:blank';

      // this.htermElem_.followObject = object;
      this.viewElem_.appendChild(object);

      var ace = document.createElement('div');
      ace.className = 'ace';
      ace.style.cssText = (
          'display: block; ' +
          'position: absolute; ' +
          'top: 0; ' +
          'left: 0; ' +
          'background-color: red; ' +
          'height: 100%; ' +
          'width: 100%; ' +
          'overflow: hidden; ' +
          'pointer-events: none;');

      this.viewElem_.appendChild(ace);

      this.viewElem_.viewClosed = function() {
        console.log('viewClosed!');
      };

      var fileSystem = environment.getServiceBinding('filesystems@axiom');
      return fileSystem.readFile(filePath, {read: true}).then(
          this.displayData_.bind(this));
    }.bind(this));
};

export default EditorView;

EditorView.sequence = 0;

EditorView.raf_ = null;

EditorView.viewClosed = function(followObject) {
  console.log('viewClosed!');
};

EditorView.prototype.displayContents_ = function(contents) {
  this.viewElem_.getElementsByClassName('ace')[0].textContent = contents;
};

EditorView.prototype.displayData_ = function(data) {
  this.displayContents_(data.data);
};
