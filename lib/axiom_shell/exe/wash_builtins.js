// Copyright (c) 2013 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import JsEntry from 'axiom/fs/js_entry';

/**
 * Shell builtins with special access to the current shell instance.
 *
 * These are not installed in the local JSFS filesystem because builtins
 * are scoped to this shell instance, but the JSFS filesystem is shared across
 * all wash shells.
 *
 * @param {Shell} shellInstance The instance of the shell these builtins should
 *   act on.
 */
export var WashBuiltins = function(shellInstance) {
  this.callbacks = {
    'pwd': function(executeContext) {
      executeContext.ready();
      var pwd = shellInstance.executeContext.getEnv('$PWD', '/');
      return Promise.resolve(pwd);
    },

    'cd': function(executeContext) {
      executeContext.ready();
      var arg = executeContext.arg || ['/'];

      if (!arg instanceof Array)
        return Promise.reject(new AxiomError.TypeMismatch('argv', 'Array'));

      var path = arg[0] || '';
      path = shellInstance.absPath(path);

      return shellInstance.executeContext.fileSystem.stat(path).then(
        function(statResult) {
          if (statResult.mode ('LIST') == -1)
            return Promise.reject(new AxiomError.TypeMismatch('dir', path));

          if (!/\/$/.test(path))
            path += '/';

          shellInstance.executeContext.setEnv('$PWD', path);
          return Promise.resolve(path);
        }
      );
    },

    'export': function(executeContext) {
      executeContext.ready();

      var arg = executeContext.arg;
      var shellEC = shellInstance.executeContext;

      if (!arg) {
        var env = shellEC.getEnvs();
        for (var key in env) {
          executeContext.stdout(key + ' = ' + JSON.stringify(env[key]) + '\n');
        }

        return Promise.resolve(null);
      }

      if (arg instanceof Array) {
        if (arg.length == 1)
          return Promise.resolve(shellEC.getEnv(arg[0]));

        if (arg.length == 2) {
          var name = arg[0];
          var value = arg[1];

          var sigil = name.substr(0, 1);
          if ('$@%'.indexOf(sigil) == -1)
            return Promise.reject(new AxiomError.Invalid('name', name));

          if (!((sigil == '$' && typeof value == 'string') ||
                (sigil == '@' && value instanceof Array) ||
                (sigil == '%' && value instanceof Object))) {
            return Promise.reject(new AxiomError.TypeMismatch(name, value));
          }

          shellEC.setEnv(arg[0], arg[1]);
          return Promise.resolve(arg[1]);
        }

        return Promise.reject(new AxiomError.Invalid('argv', 'length <= 2'));
      }

      return Promise.reject(new AxiomError.TypeMismatch('argv', 'Array'));
    }
  };  // this.callbacks = {
};

export default WashBuiltins;
