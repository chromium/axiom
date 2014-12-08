// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'axiom_shell/environment';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

export var executables = {
  /**
   * Invokes the vim editor.
   */
  'vim()': function(cx) {
    return new Promise(function(resolve, reject) {
      resolve(null);
    });
  },
};

export default executables;
