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

import htermMain from 'shell/exe/hterm';
import washExecutables from 'wash/exe_modules';

console.log('Lauching app!');

var fsm = new FileSystemManager();
var jsfs = new JsFileSystem(fsm, 'jsfs');
fsm.mount(jsfs);

// Add executables to new filesystem
jsfs.rootDirectory.mkdir('exe')
  .then(function( /** JsDirectory */ jsdir) {
    jsdir.install({
      'hterm': htermMain
    });
    jsdir.install(washExecutables);
  })
  .then(function() {
    return DomFileSystem.mount('permanent', fsm, 'html5')
      .then(function() {
        return DomFileSystem.mount('temporary', fsm, 'tmp');
      })
      .catch(function(e) {
        console.log("Error mounting DomFileSystem", e);
      });
  })
  .then(function() {
    // Execute "hterm" app, passing "wash" as command line processor
    return fsm.createExecuteContext(
      new Path('jsfs:exe/hterm'), {
        command: new Path('jsfs:exe/wash'),
        arg: { init: true }
      })
      .then(function (/** ExecutionContext */cx) {
        return cx.execute();
      });
  }).catch(function(e) {
    console.log('Error lauching app:', e);
  });
