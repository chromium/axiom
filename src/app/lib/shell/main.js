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

import axiomMain from 'axiom/main';

import shellDescriptor from 'shell/descriptor';
import environment from 'shell/environment';

import ShellCommands from 'shell/commands';
import ShellFS from 'shell/file_system';
import ShellWindows from 'shell/windows';

/**
 * @type {Promise}
 */
var __polymerReady__ = window['__polymerReady__'];

var initShell = function() {
  return axiomMain().then(function(moduleManager) {
    environment.setModuleManager(moduleManager);
    var shellModule = moduleManager.defineModule(shellDescriptor);

    var ary = [
      ['commands@axiom', ShellCommands],
      ['filesystems@axiom', ShellFS],
      ['windows@axiom', ShellWindows]
    ];

    for (var i = 0; i < ary.length; i++) {
      var def = ary[i];
      var extensionBinding = shellModule.getExtensionBinding(def[0]);
      var extension = new def[1](moduleManager);
      extension.bind(extensionBinding);
    }

    shellModule.ready();

    return moduleManager;
  });
};

export var main = function() {
  return __polymerReady__.then(initShell);
};

export default main;
