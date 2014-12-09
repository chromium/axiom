// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SpawnNacl from 'axiom_pnacl/spawn_nacl';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

/**
 * Invokes the vim editor.
 */
export var VimCommand = function(sourceUrl) {
  this.sourceUrl = sourceUrl;
};

VimCommand.prototype.run = function(cx) {
  return new Promise(function(resolve, reject) {
    // TODO(rpaquay): Cleaner URL handling.
    var url = this.sourceUrl;
    url = url.replace('/import.html', '/pnacl/vim.nmf');

    // SpawnNacl notifies ok/error completion on the execution context.
    cx.onClose.listenOnce(function(reason, value) {
      if (reason === 'ok') {
        resolve(value);
      } else {
        reject(value);
      }
    }.bind(this));

    // Execute pnacl vim.
    var nacl = new SpawnNacl('application/x-pnacl', url, cx);
    nacl.run();
  }.bind(this));
};

export default VimCommand;
