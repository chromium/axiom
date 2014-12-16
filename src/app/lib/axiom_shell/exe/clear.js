// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Termcap from 'axiom_shell/util/termcap';

/**
 * Clear the terminal screen and return the cursor to the home position.
 */
export var main = function(cx) {
  cx.ready();
  var tc = new Termcap();
  var output = tc.output('%clear-terminal()%set-row-column(row, column)',
                         {row: 1, column: 1});
  cx.stdout(output);
  return Promise.resolve(null);
};

export default main;

main.argSigil = '';
