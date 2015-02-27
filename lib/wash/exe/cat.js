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

var CAT_CMD_USAGE_STRING = 'usage: cat [file...]';

export var main = function(executeContext) {
  executeContext.ready();

  var arg = executeContext.arg;
  if (!arg['_'] || (arg['_'].length === 0) || arg['h'] || arg['help']) {
    executeContext.stdout(CAT_CMD_USAGE_STRING + '\n');
    return executeContext.closeOk();
  }

  var fileSystem = executeContext.fileSystem;

  var catNext = function() {
    if (!arg['_'].length) {
      return executeContext.closeOk();
    }

    /** @type {string} */
    var pathSpec = arg['_'].shift();
    pathSpec = Path.abs(executeContext.getEnv('$PWD', '/'), pathSpec);

    fileSystem.readFile(new Path(pathSpec)).then(
      function(result) {
        executeContext.stdout(result.data);
        return catNext();
      }
    ).catch(function(e) {
        var errorString;

        if (e instanceof AxiomError) {
          errorString = e.errorName;
        } else {
          errorString = e.toString();
        }

        executeContext.stdout('cat: ' + pathSpec + ': ' + errorString + '\n');
        return catNext();
      }
    );
  };
};

export default main;

main.argSigil = '%';
