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
import PnaclCommand from 'shell/pnacl/pnacl_command';

var PNACL_CMD_USAGE_STRING = 'usage: pnacl <name> <url> [tarFileName]';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * @param {JsExecuteContext} executeContext
 */
export var main = function(executeContext) {
  executeContext.ready();

  var arg = executeContext.arg;
  if (!arg._ || (arg._.length < 2) || arg['h'] || arg['help']) {
    executeContext.stdout(PNACL_CMD_USAGE_STRING + '\n');
    return executeContext.closeOk();
  }

  /** @type {string} */
  var name = arg._[0];

  /** @type {string} */
  var url = arg._[1];

  /** @type {string} */
  var tarFileName = '';

  if (arg._.length > 2) {
    tarFileName = arg._[2];
  }

  /** @type {string} */
  var pwd = executeContext.getEnv('$PWD', '/');

  var pnaclCommand = new PnaclCommand(name, url, tarFileName);

  return pnaclCommand.run(executeContext);
};

export default main;

main.argSigil = '%';
