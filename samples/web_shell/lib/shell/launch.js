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

import JsFileSystem from 'axiom/fs/js/file_system';
import DomFileSystem from 'axiom/fs/dom/file_system';
import FileSystemManager from 'axiom/fs/base/file_system_manager';
import ExecuteContext from 'axiom/fs/base/execute_context';
import Path from 'axiom/fs/path';

import scriptMain from 'shell/exe/script';
import TerminalView from 'shell/terminal';
import washExecutables from 'wash/exe_modules';

export var main = function() {

  console.log('Lauching app!');

  var fsm = new FileSystemManager();
  var jsfs = new JsFileSystem(fsm, 'jsfs');
  fsm.mount(jsfs);

  // Add executables to new filesystem
  jsfs.rootDirectory.mkdir('exe')
    .then(function( /** JsDirectory */ jsdir) {
      jsdir.install({
        'script': scriptMain
      });
      jsdir.install(washExecutables);
    })
    .then(function() {
      return DomFileSystem.mount(fsm, 'html5', 'permanent')
        .then(function() {
          return DomFileSystem.mount(fsm, 'tmp', 'temporary');
        })
        .catch(function(e) {
          console.log("Error mounting DomFileSystem", e);
        });
      })
    .then(function() {
      return launchHterm(fsm);
    }).catch(function(e) {
      console.log('Error lauching app:', e);
    });
};

export default main;

var launchHterm = function(fsm) {
  return fsm.createExecuteContext(
    new Path('jsfs:exe/wash'), {})
    .then(function (/** ExecutionContext */cx) {
      var tv = new TerminalView();

      cx.setEnvs({
        '@PATH': ['jsfs:/exe'],
        '$TERM': 'xterm-256color',
        '$HOME': 'html5:/home',
        '$HISTFILE': 'html5:/home/.wash_history'
      });
      tv.execute(cx);

      fsm.createExecuteContext(new Path('jsfs:exe/script'), {'_': ['http://axiom-sample.localhost/scripts/editor.js']}).then(function(cx2) {
        return cx2.execute();
      }).then(function() {
        return fsm.createExecuteContext(new Path('jsfs:exe/editor'), {'_': ['/esdf']});
      }).then(function(cx3) {
        cx3.execute();
      });

      return Promise.resolve(null);
  });
}
