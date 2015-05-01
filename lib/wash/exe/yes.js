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

import Ephemeral from 'axiom/core/ephemeral';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * Simple callback for a JsExecutable which echos the argument list to stdout
 * and exits.
 *
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  if (cx.getArg('help', false)) {
    cx.stdout.write([
      'Usage: yes [VALUE]...',
      '',
      'Options:',
      '',
      '  -h, --help',
      '      Print this help message and exit.',
      '',
      'Repeatedly output a line with all specified VALUE(s), or "y" by default.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  var printStr = cx.getArg('_', ['y']).join(' ') + '\n';
  var printFunc = function() {
    if (cx.isEphemeral(Ephemeral.State.Ready)) {
      cx.stdout.write(printStr);
      setTimeout(printFunc, 10);
    }
  };
  printFunc();
};

export default main;

main.signature = {
  '_': '@',
  'help|h': '?'
};
