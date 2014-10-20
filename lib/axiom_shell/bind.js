// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import ShellCommands from 'axiom_shell/commands';

export var bind = function(shellModule) {
  var extensionDefs = [
    ['commands', ShellCommands]
  ];

  var bindExtension = function(extensionDef) {
    var extension = new extensionDef[1]();
    var extensionBinding = shellModule.getExtensionBinding(extensionDef[0]);
    extension.bind(extensionBinding);
  };

  for (var i = 0; i < extensionDefs.length; i++) {
    bindExtension(extensionDefs[i]);
  }
};

export default bind;
