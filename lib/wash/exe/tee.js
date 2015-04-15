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

import OpenMode from 'axiom/fs/open_mode';
import Path from 'axiom/fs/path';
import WritableFileStreamBuffer from 'axiom/fs/stream/writable_file_stream_buffer';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();
  
  var argv = cx.getArg('_');

  if (argv.length !== 1 || cx.getArg('help', false)) {
    cx.stdout.write([
      'Usage: tee [-a] <file>',
      'Example: cat in.txt | tee -a out.txt | sort > sorted_out.txt',
      '',
      'Options:',
      '',
      '  -h|--help',
      '      Print this help message and exit.',
      '  -a|--append',
      '      Append to the output file rather than overwrite it.',
      '',
      'Copies standard input to standard output, saving a copy to a file.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  var filePath = Path.abs(cx.getPwd(), argv[0]);
  var fileMode = /** @type {!OpenMode} */
      (OpenMode.fromString(cx.getArg('a') ? 'wc' : 'wct'));
  var fileBuffer = new WritableFileStreamBuffer(
      cx.fileSystemManager, filePath, fileMode);

  cx.stdin.onData.addListener(function(data) {
    fileBuffer.write(data);
    cx.stdout.write(data);
  });

  cx.stdin.onEnd.listenOnce(function() {
    fileBuffer.close();
    cx.closeOk();
  });
  
  cx.stdin.resume();
};

export default main;

main.signature = {
  '_': '@',
  'help|h': '?',
  'append|a': '?'
};
