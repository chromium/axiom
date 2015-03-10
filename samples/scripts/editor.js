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

  var editMain = function(cx) {
    cx.ready();
    this.fsm = null;
    this.path = null;

    var list = cx.getArg('_', []);
    if (list.length != 1 || cx.getArg('help')) {
      cx.stdout(EDITOR_CMD_USAGE_STRING + '\n');
      return cx.closeOk();
    }

    return Promise.resolve().then(function() {
      // Any args == path
      if (list.length) {
        var pathSpec = list.shift();
        var pwd = cx.getPwd();
        this.path = axiom.fs.path.Path.abs(pwd, pathSpec);

        this.fsm = cx.fileSystemManager;
        return this.fsm.readFile(this.path).then(function(contents) {
          return contents;
        }).catch(function(e) {
          if (axiom.core.error.AxiomError.NotFound.test(e)) {
            return this.fsm.writeFile(this.path,
                axiom.fs.data_type.DataType.UTF8String, '').then(function() {
                  return '';
                });
          }
          return Promise.reject(e);
        })
      }
    }).then(function (contents) {
      this.contents = contents.data;

      var editorWindowPromise = new Promise(function(resolve, reject){
        this.editorResolve = resolve;
      }.bind(this));

      window.onEditorWindowOpened = function() {
        console.log("onEditorWindowOpened ");
        editorWindow.onReady = function() {
          // TODO(ericarnold): rework so that errors fall through promise
          // (assign editorResolve directly to editorWindow.onReady)
          this.editorResolve(editorWindow);
        }.bind(this);
        editorWindow.onSave = function(contents) {
          return this.fsm.writeFile(this.path,
              axiom.fs.data_type.DataType.UTF8String, contents);
        }.bind(this);
      }.bind(this);

      // TODO(ericarnold): multiple editors?
      var editorWindow = window.open('/editor', 'editor');

      // (will only continue once editor window is ready)
      return editorWindowPromise;
    }).then(function (editorWindow) {
      editorWindow.setContents(this.contents);
      return cx.closeOk();
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
