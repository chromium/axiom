// Copyright (c) 2013 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import JsEntry from 'axiom/fs/js_entry';
import Path from 'axiom/fs/path';

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
    'pwd()': function(executeContext) {
      executeContext.ready();
      var pwd = shellInstance.executeContext.getEnv('$PWD', '/');
      return Promise.resolve(pwd);
    },

    'cd($)': function(executeContext) {
      executeContext.ready();

      var path = shellInstance.absPath(executeContext.arg || '');

      return shellInstance.fileSystem.stat(path).then(
        function(statResult) {
          if (!(statResult.mode & Path.mode.d))
            return Promise.reject(new AxiomError.TypeMismatch('dir', path));

          if (!/\/$/.test(path))
            path += '/';

          shellInstance.executeContext.setEnv('$PWD', path);
          return Promise.resolve(null);
        }
      );
    },

    'env-del(@)': function(executeContext) {
      executeContext.ready();

      var arg = executeContext.arg;
      for (var i = 0; i < arg.length; i++) {
        shellInstance.executeContext.delEnv(arg[i]);
      }

      return Promise.resolve(null);
    },

    'env-get(@)': function(executeContext) {
      executeContext.ready();

      var arg = executeContext.arg;
      if (!arg.length)
        return Promise.resolve(shellInstance.executeContext.getEnvs());

      var rv = {};
      for (var i = 0; i < arg.length; i++) {
        rv[arg[i]] = shellInstance.executeContext.getEnv(arg[i]);
      }

      return Promise.resolve(rv);
    },

    'env-set(%)': function(executeContext) {
      executeContext.ready();

      var arg = executeContext.arg;
      for (var name in arg) {
        var value = arg[name];
        var sigil = name.substr(0, 1);
        if ('$@%'.indexOf(sigil) == -1)
          return Promise.reject(new AxiomError.Invalid('name', name));

        if (!((sigil == '$' && typeof value == 'string') ||
              (sigil == '@' && value instanceof Array) ||
              (sigil == '%' && value instanceof Object))) {
          return Promise.reject(new AxiomError.TypeMismatch(sigil, value));
        }

        shellInstance.executeContext.setEnv(name, value);
      }

      return Promise.resolve(null);
    },

    'exit()': function(executeContext) {
      executeContext.ready();
      shellInstance.executeContext.closeOk(null);
      return Promise.resolve(null);
    }
  };  // this.callbacks = {
};

export default WashBuiltins;
