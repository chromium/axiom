// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'axiom_shell/environment';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

export var executables = {
  /**
   * Takes a string or array argument, returns the string reversed.
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
   * Takes a numeric argument, return a seqence of numbers from 1...n to.
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

      var rv = new Array(count);
      for (var i = 1; i <= count; i++)
        rv[i - 1] = i;

      resolve(rv);
    });
  },

  /**
   * Combine 'reverse' and 'seq' into a command that returns a reversed
   * sequence of the given length.
   */
  'reverse-seq($)': function(cx) {
    cx.ready();

    // cx.fileSystem is the filesystem this command was installed into, ie,
    // the one defined by axiom_thing.  The global filesystem can be retrieved
    // from the environment.
    //
    // TODO(rginda): We should support a lightweight way to call other
    // functions that take-cx/return-promise directly.
    return cx.callPromise(cx.fileSystem, '/exe/seq', cx.arg).then(
      function(value) {
        return cx.callPromise(cx.fileSystem, '/exe/reverse', value);
      });
  },

  /**
   * Interactive program that prompts the user for their name and gives a
   * personalized greeting.
   */
  'hello()': function(cx) {
    return new Promise(function(resolve, reject) {
      cx.ready();

      // This is the global axiom_shell filesystem.
      var fileSystem = environment.getServiceBinding('filesystems@axiom');

      // TODO(rginda): Path searching is stuck in wash.js/findExecutable(), we
      // should move it somewhere where other apps can get to it.  For now we
      // hardcode the path to readline.
      return cx.callPromise(fileSystem, '/axiom_shell/exe/readline',
                            {'promptString': 'What is your name? '}).then(
        function(value) {
          if (value) {
            cx.stdout('Hi, ' + value + '.\n');
          } else {
            cx.stdout('Sorry for asking.\n');
          }

          return resolve(null);
        }
      );
    });
  },
};

export default executables;
