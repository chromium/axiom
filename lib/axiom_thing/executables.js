// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

export var executables = {
  /**
   * Takes a string argument, returns the string reversed.
   * @param {ExecuteContext} cx
   */
  'reverse(*)': function(cx) {
    return new Promise(function(resolve, reject) {
      cx.ready();

      var rv;
      if (typeof cx.arg == 'string') {
        rv = cx.arg.split('').reverse().join('');
      } else if (cx.arg instanceof Array) {
        rv = cx.arg.reverse();
      } else {
        return reject(new AxiomError.TypeMismatch('string or array', cx.arg));
      }

      resolve(rv);
    });
  },

  /**
   * Takes a numeric argument, prints 1...n to stdout.
   * @param {ExecuteContext} cx
   */
  'seq($)': function(cx) {
    return new Promise(function(resolve, reject) {
      cx.ready();
      var count = parseInt(cx.arg);
      if (!count || isNaN(count)) {
        reject(new AxiomError.TypeMismatch('integer', cx.arg));
        return;
      }

      for (var i = 1; i <= count; i++)
        cx.stdout(i + '\n');

      resolve(null);
    });
  },
};

export default executables;
