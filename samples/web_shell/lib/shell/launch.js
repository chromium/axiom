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

var welcomeMessage = [
  'Welcome to the Axiom web_shell sample.',
  '',
  'This is a cross-browser interactive shell written in JavaScript which ',
  'can be extended with new commands at runtime.',
  '',
  'To get started, try:',
  ' * \x1b[1mmount\x1b[m to see a list of mounted filesystems.',
  ' * \x1b[1mls\x1b[m to see the contents of the current directory.',
  ' * \x1b[1mls jsfs:/exe\x1b[m to list the executables.',
  ' * \x1b[1mcd <path>\x1b[m to change your working directory.',
  ' * \x1b[1menv-get\x1b[m, \x1b[1menv-set\x1b[m, and \x1b[1menv-del\x1b[m ' +
      'to view and modify environment variables.',
  ' * \x1b[1mscript <url>\x1b[m to load third party scripts (but be careful).',
  '',
  'For more information, please visit: \x1b[1mhttp://goo.gl/DmDqct\x1b[m',
  ''
].join('\r\n');

export var main = function() {
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
  var stdioSource = new StdioSource();
  return fsm.createExecuteContext(
    new Path('jsfs:exe/wash'), stdioSource.stdio, {})
    .then(function (/** ExecuteContext */cx) {
      var tv = new TerminalView();

      tv.println(welcomeMessage);

      cx.setEnvs({
        '@PATH': ['jsfs:/exe'],
        '$TERM': 'xterm-256color',
        '$HOME': 'html5:/',
        '$HISTFILE': 'html5:/.wash_history'
      });
      tv.execute(stdioSource, cx);


      var delay = function(ms, command) {return new Promise(function(rs, rj) {setTimeout(
          function() {rs() }, ms)}).then(function() {tv.stdioSource.stdin.write(command);
          tv.stdioSource.stdin.write('\r');})};

      delay(100,
          'mkstream --src ws://localhost:8000 --type extension --src lfbhahfblgmngkkgbgbccedhhnkkhknb jsfs:/bar3.str').then(function () {return delay(100,
          'mount.stream jsfs:/bar3.str')}).then(function () {return delay(100,
          'mount')}).then(function () {return delay(100,
          // 'ls streamfs:/')}).then(function () {return delay(100,
          '')});

      // delay(100,
      //     'mkstream --src ws://localhost:8000 --type extension jsfs:/bar3.str').then(function () {return delay(100,
      //     'mount.stream jsfs:/bar3.str')}).then(function () {return delay(100,
      //     'mount')}).then(function () {return delay(100,
      //     // 'ls streamfs:/')}).then(function () {return delay(100,
      //     '')});

      // delay(100,
      //     'mkstream --src ws://localhost:8000 --type websocket jsfs:/bar3.str').then(function () {return delay(100,
      //     'mount.stream jsfs:/bar3.str')}).then(function () {return delay(100,
      //     'mount')}).then(function () {return delay(100,
      //     // 'ls streamfs:/')}).then(function () {return delay(100,
      //     '')});

      // }.bind(this, tv), 100)

      // setTimeout(function(tv) {
        // tv.stdioSource.stdin.write('mount.stream jsfs:/bar3.str');
        // tv.stdioSource.stdin.write('\r');
      // }.bind(this, tv), 200)
// mount.stream jsfs:/bar3.str
      // debugger;

      return Promise.resolve(null);
  });
};
