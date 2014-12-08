// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

/**
 * Invokes the vim editor.
 */
export var main = function(cx) {
  return new Promise(function(resolve, reject) {
    cx.ready();
    cx.stdout('vim is coming soon!\n');
    resolve(null);
  });
};

export default main;
