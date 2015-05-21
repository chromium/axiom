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
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  if (cx.getArg('help', false) || cx.getArg('_')) {
    cx.stdout.write([
      'Usage: sort',
      'Example: cat foo.txt | sort > sorted_foo.txt',
      '',
      'Options:',
      '',
      '  -h, --help',
      '      Print this help message and exit.',
      '  -f, --ignore-case',
      '      Fold lower case to upper case characters.',
      '  -n, --numeric-sort',
      '      Compare according to string numerical value.',
      '  -r, --reverse',
      '      Reverse the result of comparisons.',
      '  -z, --zero-terminated',
      '      End lines with 0 byte, not newline.',
      '',
      'A filter that reads the lines from stdin until it closes, sorts them,',
      'and prints the result to stdout.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  var ignoreCase = cx.getArg('ignore-case', false);
  var reverse = cx.getArg('reverse', false);
  var zeroTerminate = cx.getArg('zero-terminated', false);
  var eol = zeroTerminate ? '\x00' : '\n';
  var eof = zeroTerminate ? '' : '\n';
  var compareOptions = {
    sensitivity: ignoreCase ? 'accent' : 'case',
    numeric: cx.getArg('numeric-sort', false),
    caseFirst: ignoreCase ? 'false' : 'upper'
  };

  var compare = function(a, b) {
    var cmp = a.localeCompare(b, [], compareOptions);
    return reverse ? -cmp : cmp;
  };

  var input = '';

  cx.stdin.onData.addListener(function(data) {
    input += data;
  });

  cx.stdin.onEnd.listenOnce(function() {
    cx.stdout.write(input.split('\n').sort(compare).join(eol) + eof);
    cx.closeOk();
  });

  // Let the data flow to the handlers.
  cx.stdin.resume();
};

export default main;

main.signature = {
  '_': '@',
  'help|h': '?',
  'ignore-case|f': '?',
  'numeric-sort|n': '?',
  'reverse|r': '?',
  'zero-terminated|z': '?'
};
