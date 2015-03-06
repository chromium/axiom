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

import TerminalView from 'shell/terminal';
import washExecutables from 'wash/exe_modules';

console.log('Lauching app!');

var fsm = new FileSystemManager();
var jsfs = new JsFileSystem(fsm, 'jsfs');
fsm.mount(jsfs);

// Add executables to new filesystem
jsfs.rootDirectory.mkdir('exe')
    .then(function( /** JsDirectory */ jsdir) {
      jsdir.install(washExecutables);
      var editExec = {
        'edit($)': function(cx) {
          cx.ready();

          if (cx.arg && typeof cx.arg != 'string')
            return cx.closeError(new AxiomError.TypeMismatch('string', cx.arg));

          return launchEditor(cx, cx.arg).then(function() {
            cx.stdout('blah2\n');
            cx.closeOk();
          })
        }
      }

      jsdir.install(editExec);

      return DomFileSystem.mount(fsm, 'html5', 'permanent').then(function() {
        return DomFileSystem.mount(fsm, 'tmp', 'temporary');
      }).catch(function(e) {
        console.log("Error mounting DomFileSystem", e);
      });
    }).then(function() {
      return launchHterm();
    }).catch(function(e) {
      console.log('Error lauching app:', e);
    });

var launchEditor = function(cx, path) {
  if (path) {
    /** @type {string} */
    var pwd = cx.getEnv('$PWD',
        cx.fileSystemManager.defaultFileSystem.rootPath.spec);
    /** @type {Path} */
    var path = Path.abs(pwd, cx.arg);

    return cx.fileSystemManager.stat(path);
        // .then(function(* StatResult  statResult) {
        // });
  } else {
    window.open("editor.html");
    cx.stdout('blah\n');
    return Promise.resolve();
  }
}

var launchHterm = function() {
  return fsm.createExecuteContext(
    new Path('jsfs:exe/wash'), {})
    .then(function (/** ExecutionContext */cx) {
      var tv = new TerminalView();
      var env = cx.arg['env'] || {
        '@PATH': ['jsfs:exe'],
        '$TERM': 'xterm-256color'
      };
      cx.setEnvs(env);
      tv.execute(cx);
      return Promise.resolve(null);
  });
}
