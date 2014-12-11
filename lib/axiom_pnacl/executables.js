// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'axiom_shell/environment';

import PnaclCommand from 'axiom_pnacl/pnacl_command';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

var createCommand = function(commandName, sourceUrl, tarFilename) {
  var command = new PnaclCommand(commandName, sourceUrl, tarFilename);
  return command.run.bind(command);
};

export var executables = function(sourceUrl) {
  return {
    'curl(@)': createCommand('curl', sourceUrl),
    'nano(@)': createCommand('nano', sourceUrl, 'nano.tar'),
    'nethack(@)': createCommand('nethack', sourceUrl, 'nethack.tar'),
    'python(@)': createCommand('python', sourceUrl, 'pydata_pnacl.tar'),
    'unzip(@)': createCommand('unzip', sourceUrl),
    'vim(@)': createCommand('vim', sourceUrl, 'vim.tar'),
  };
};

export default executables;
