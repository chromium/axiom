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

  var pathSpec = arg.path;
  pathSpec = Path.abs(executeContext.getEnv('$PWD', '/'), pathSpec);

  var fileSystem = environment.getServiceBinding('filesystems@axiom');

  return fileSystem.readFile(pathSpec, {read: true}).then(
    function(data) { 
      executeContext.stdout(data.data);
    });
};

export default main;

main.argSigil = '%';
