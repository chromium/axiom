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
import GDriveFileSystem from 'axiom/fs/gdrive/file_system';
import FileSystemManager from 'axiom/fs/base/file_system_manager';
import ExecuteContext from 'axiom/fs/base/execute_context';
import StdioSource from 'axiom/fs/stdio_source';
import Path from 'axiom/fs/path';

import scriptMain from 'shell/exe/script';
import TerminalView from 'shell/terminal';
import washExecutables from 'wash/exe_modules';

export var main = function() {

  console.log('Lauching app!');

  var fsm = new FileSystemManager();

  var jsfs = new JsFileSystem(fsm, 'jsfs');
  var domfs = new DomFileSystem(fsm, 'html5', 'permanent');
  var tmpfs = new DomFileSystem(fsm, 'tmp', 'temporary');
  var gdrivefs = new GDriveFileSystem(fsm, 'gdrive');

  jsfs.mount()
  .then(function() {
    return jsfs.rootDirectory.mkdir('exe');
  })
  .then(function( /** JsDirectory */ jsdir) {
    // Add executables to new filesystem.
    jsdir.install({
      'script': scriptMain
    });
    return jsdir.install(washExecutables);
  })
  .then(function() {
    var mountPromises = [domfs.mount(), tmpfs.mount()];
    if (false /* TODO(ussuri): replace with value from .rc file */) {
      mountPromises.push(gdrivefs);
    }
    return Promise.all(mountPromises)
      .catch(function(e) {
        console.log("Error mounting file system", e);
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
  var stdioSource = new StdioSource();
  return fsm.createExecuteContext(
      new Path('jsfs:exe/wash'), stdioSource.stdio, {})
    .then(function (/** ExecutionContext */cx) {
      var tv = new TerminalView();
      cx.setEnvs({
        '@PATH': ['jsfs:/exe'],
        '$TERM': 'xterm-256color',
        '$HOME': 'html5:/home',
        '$HISTFILE': 'html5:/home/.wash_history'
      });
      tv.execute(stdioSource, cx);
      return Promise.resolve(null);
  });
};
