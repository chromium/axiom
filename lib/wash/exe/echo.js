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

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

var help = [
  'Usage: echo <options> ...',
  '',
  'Options:',
  '',
  '  --no-p, --no-pluck',
  '      Always print the arguments as an array, even if there is only one.',
  '  -h, --help',
  '      Print this help message and exit.',
  '  -s, --space <string>',
  '      Specify the whitespace used in array and object literals.  Defaults',
  '      to "  ".',
  '',
  'Serializes the arguments using JSON.stringify and echos them to stdout.'
];

/**
 * Simple callback for a JsExecutable which echos the argument list to stdout
 * and exits.
 *
 * @param {JsExecuteContext} cx
 * @return {!Promise<*>}
 */
export var main = function(cx) {
  cx.ready();

  if (cx.getArg('help', false)) {
    cx.stdout.write(help.join('\r\n') + '\r\n');
    return cx.closeOk();
  }

  var list = cx.getArg('_');
  var value;

  if (list.length == 1 && cx.getArg('pluck', true)) {
    value = list[0];
  } else {
    value = list;
  }

  cx.stdout.write(JSON.stringify(value, null, cx.getArg('space', '  ')) + '\n');
  return cx.closeOk();
};

export default main;

main.signature = {
  '_': '@',
  'help|h': '?',
  'pluck|p': '?',
  'space|s': '$'
};
