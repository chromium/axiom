// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import Path from 'axiom/fs/path';

import environment from 'axiom_shell/environment';
import util from 'axiom_shell/util';

export var main = function(executeContext) {
  executeContext.ready();

  var arg = executeContext.arg || [];
  if (!arg instanceof Array)
    return Promise.reject(new AxiomError.TypeMismatch('argv', 'Array'));

  var fromPathSpec = arg[0] || '';
  var toPathSpec = arg[1] || '';
  fromPathSpec = Path.abs(executeContext.getEnv('$PWD', '/'), fromPathSpec);
  toPathSpec = Path.abs(executeContext.getEnv('$PWD', '/'), toPathSpec);

  var fileSystem = environment.getServiceBinding('filesystems@axiom');

  return fileSystem.readFile(fromPathSpec, {read: true}).then(
    function(data) {
      return fileSystem.writeFile(toPathSpec, {write: true}, {data: data});
    });
};

export default main;

