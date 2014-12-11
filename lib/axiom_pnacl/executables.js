// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'axiom_shell/environment';

import PnaclCommand from 'axiom_pnacl/pnacl_command';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

export var executables = function(sourceUrl) {
  return {
    'vim(@)': function() {
      var command = new PnaclCommand('vim', sourceUrl, 'vim.tar');
      return command.run.bind(command);
    }()
  };
};

export default executables;
