// Copyright 2015 Google Inc. All rights reserved.
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

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  var list = cx.getArg('_', []);
  if ((list.length === 0 || !cx.getArg('src') || !cx.getArg('type')) ||
      cx.getArg('help')) {
    cx.stdout.write([
      'usage: mkstream -s|--src <url> -t|--type <stream-type> <path>',
      'Create a new stream located at <path>.',
      '',
      'Options:',
      '',
      '  -h, --help',
      '      Print this help message and exit.',
      '  -s, --src <url>',
      '      The url to open when the stream is opened.',
      '  -t, --type <stream-type>',
      '      The stream type: iframe, websocket or serviceworker.',
      '',
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  cx.closeOk();
};

export default main;

main.signature = {
  'help|h': '?',
  'src|s': '$',
  'type|t': '$',
  '_': '@'
};
