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

window.onload = function() {
  var editor = window.aceEditor = ace.edit('editor');

  var event = new Event('ready');
  event.initEvent('ready', false, false);
  this.dispatchEvent(event);

  editor.focus();
  editor.commands.addCommand({
    name: 'saveFile',
    bindKey: {
      win: 'Ctrl-S',
      mac: 'Command-S',
      sender: 'editor|cli'
    },
    exec: (function(editor, args, request) {
      var event = new Event('save');
      event.initEvent('save', false, false);
      event.target = this;
      this.dispatchEvent(event);
    }).bind(this)
  });
}

if (window.opener && window.opener.onEditorWindowOpened) {
  window.opener.onEditorWindowOpened();
}

function setContents(contents) {
  var session = window.aceEditor.getSession();
  session.setValue(contents, -1);
}

function getContents() {
  var session = window.aceEditor.getSession();
  return session.getValue();
}
