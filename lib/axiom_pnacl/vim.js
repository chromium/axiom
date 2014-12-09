// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

/**
 * Invokes the vim editor.
 */
export var VimCommand = function(sourceUrl) {
  this.sourceUrl = sourceUrl;
};

VimCommand.prototype.run = function(cx) {
  return new Promise(function(resolve, reject) {
    cx.ready();
    cx.stdout('vim is coming soon from ' + this.sourceUrl + '!\n');
    resolve(null);
  }.bind(this));
};

export default VimCommand;
