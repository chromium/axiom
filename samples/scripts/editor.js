
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

document.currentScript.ready(function(cx) {
  var PNACL_CMD_USAGE_STRING = 'usage: edit <path>';

  var editorMain = function(cx) {
    cx.ready();

    var list = cx.getArg('_', []);
      if (list.length > 1 || cx.getArg('help')) {
        cx.stdout(PNACL_CMD_USAGE_STRING + '\n');
        return cx.closeOk();
      }

      // if (list.length != 0) {

      var pwd = cx.getEnv('$PWD', '/');

      // var editorCommand = new PnaclCommand(name, url, tarFileName);
      // return editorCommand.run(cx);
      var editorWindow = window.open('/editor', 'editor');
      editorWindow.owner = this;
      // window.onbeforeunload = function(){

      return cx.closeOk();
    };

    editorMain.signature = {
      'help|h': '?',
      '_': '@'
    };

  var installEditor = function(cx) {
    var path = new axiom.fs.path.Path('jsfs:/exe');
    var jsDir = cx.jsfs.resolve(path).entry;
    jsDir.install({
      'editor': editorMain
    });
  };

  installEditor(cx);
});
