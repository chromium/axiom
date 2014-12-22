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

import AxiomError from 'axiom/core/error';
import Path from 'axiom/fs/path';

import environment from 'shell/environment';
import util from 'shell/util';

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
