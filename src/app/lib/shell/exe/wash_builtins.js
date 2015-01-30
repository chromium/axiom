// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// import Shell from 'shell/exe/wash';
import AxiomError from 'axiom/core/error';
import JsEntry from 'axiom/fs/js_entry';
import Path from 'axiom/fs/path';

/**
 * @constructor
 *
 * Shell builtins with special access to the current shell instance.
 *
 * These are not installed in the local JSFS filesystem because builtins
 * are scoped to this shell instance, but the JSFS filesystem is shared across
 * all wash shells.
 *
 */
var WashBuiltins = function(shellInstance) {
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
          if (!(statResult.mode & Path.Mode.D))
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
    }
  };  // this.callbacks = {
};

export {WashBuiltins};
export default WashBuiltins;
