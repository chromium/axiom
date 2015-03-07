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

export var main = function(cx) {
  cx.ready();

  var list = cx.getArg('_', []);
  if (!list.length || cx.getArg('help')) {
    cx.stdout(CAT_CMD_USAGE_STRING + '\n');
    return cx.closeOk();
  }

  var fileSystem = cx.fileSystemManager;

  var catNext = function() {
    if (!list.length) {
      return cx.closeOk();
    }

    /** @type {string} */
    var pathSpec = list.shift();
    /** @type {string} */
    var pwd = cx.getPwd();
    /** @type {Path} */
    var path = Path.abs(pwd, pathSpec);

    return fileSystem.readFile(path).then(
      function(result) {
        cx.stdout(result.data);
        return catNext();
      }
    ).catch(function(e) {
        var errorString;

        if (e instanceof AxiomError) {
          errorString = e.errorName;
        } else {
          errorString = e.toString();
        }

        cx.stdout('cat: ' + path.originalSpec + ': ' + errorString + '\n');
        return catNext();
      }
    );
  };

  return catNext();
};

export default main;

main.signature = {
  'help|h': '?',
  "!_": '@'
};
