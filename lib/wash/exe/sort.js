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

// import ReadableStreamForwarder from 'axiom/fs/stream/readable_stream_forwarder';

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
      '',
      'A filter that reads the lines from stdin until it closes, sorts them,',
      'and prints the result to stdout.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  var input = '';

  cx.stdin.onData.addListener(function(data) {
    input += data;
  });

  cx.stdin.onEnd.listenOnce(function() {
    cx.stdout.write(input.split('\n').sort().join('\n') + '\n');
    cx.closeOk();
  });
  
  cx.stdin.resume();
};

export default main;

main.signature = {
  '_': '@',
  'help|h': '?'
};
