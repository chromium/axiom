// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import Path from 'axiom/fs/path';

import environment from 'axiom_shell/environment';
import util from 'axiom_shell/util';

export var main = function(executeContext) {
  executeContext.ready();

  var arg = executeContext.arg;

  var fromPathSpec = arg.src;
  var toPathSpec = arg.dst;
  fromPathSpec = Path.abs(executeContext.getEnv('$PWD', '/'), fromPathSpec);
  toPathSpec = Path.abs(executeContext.getEnv('$PWD', '/'), toPathSpec);

  var fileSystem = environment.getServiceBinding('filesystems@axiom');

  return fileSystem.readFile(fromPathSpec, {read: true}).then(
    function(result) {
      return fileSystem.writeFile(toPathSpec, {write: true}, {data: result.data});
    });
};

export default main;

main.argSigil = '%';
