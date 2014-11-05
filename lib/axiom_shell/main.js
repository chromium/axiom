// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import axiomMain from 'axiom/main';

import shellDescriptor from 'axiom_shell/descriptor';

import ShellCommands from 'axiom_shell/commands';
import ShellFS from 'axiom_shell/filesystems';

export var main = function() {
  return axiomMain().then(function(moduleManager) {
    var shellModule = moduleManager.defineModule(shellDescriptor);

    var ary = [
        ['commands@axiom', ShellCommands],
        ['filesystems@axiom', ShellFS]];

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

export default main;
