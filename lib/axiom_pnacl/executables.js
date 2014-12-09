// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'axiom_shell/environment';

import VimCommand from 'axiom_pnacl/vim';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

export var executables = function(sourceUrl) {
  return {
    'vim(@)': function() {
      var vimCommand = new VimCommand(sourceUrl);
      return vimCommand.run.bind(vimCommand);
    }()
  };
};

export default executables;
