// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'shell/environment';

export var EditorView = function(filePath) {
  EditorView.sequence++;
  this.id = 'editor-' + EditorView.sequence;
  this.filePath = filePath;

  var viewsBinding = environment.getServiceBinding('views@axiom');
  this.whenReady = viewsBinding.whenLoadedAndReady().then(function() {
      this.fileSystem = environment.getServiceBinding('filesystems@axiom');
      return this.fileSystem.readFile(filePath, {read: true});
    }.bind(this)).then(function(data) {
      this.contents = data.data;
      return viewsBinding.register(this.id, 'div');
    }.bind(this)).then(function() {
      return viewsBinding.show(this.id);
    }.bind(this)).then(function(viewElem) {
      this.viewElem_ = viewElem;

      var object = document.createElement('object');
      var editorCssText = 
          'display: block; ' +
          'position: absolute; ' +
          'top: 0; ' +
          'left: 0; ' +
          'height: 100%; ' +
          'width: 100%; ' +
          'overflow: hidden; ' +
          'pointer-events: none;';

      object.style.cssText = editorCssText;// + 'background-color: red; z-index: -10;';

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

      this.viewElem_.appendChild(object);

      var ace = document.createElement('div');
      ace.className = 'editor';
      ace.style.cssText = editorCssText;// + 'background-color: green; z-index: 1000;';

      this.viewElem_.appendChild(ace);

      this.editor = window.ace.edit(ace);
      // this.editor.followObject = object;

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
          return this.fileSystem.writeFile(filePath, {write: true},
              {data: this.editor.getSession().getValue()});
        }).bind(this)
      });

      this.viewElem_.viewClosed = function() {
        console.log('viewClosed!');
      };

      this.viewElem_.onmousedown = (function(e) {
        this.editor.focus();
        console.log(e.target);
        

      //   // setTimeout( function() {
      //   //   t.dispatchEvent(e);
      //   // }, 1);
      //   return true;
      // }).bind(this);
      // document.onclick  = (function(e) {
      //   console.log('click!');
      }).bind(this);

      this.displayContents_(this.contents);
    }.bind(this));
};

export default EditorView;

EditorView.sequence = 0;

EditorView.raf_ = null;

EditorView.viewClosed = function(followObject) {
  console.log('viewClosed!');
};

EditorView.prototype.displayContents_ = function(contents) {
  this.editor.getSession().setValue(contents, -1);
  this.editor.setReadOnly(false);
};

EditorView.prototype.displayData_ = function(data) {
  this.displayContents_(data.data);
};
