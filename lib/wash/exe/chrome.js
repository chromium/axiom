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
import chromeAgentClient from 'wash/chrome_agent_client';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  var api = cx.getArg('method');
  var args = cx.getArg('args', {});

  if (!api || cx.getArg('help')) {
    cx.stdout.write([
      'For the list of available APIs, see ',
      'https://developer.chrome.com/extensions/api_index.',
      '',
      'Some interesting APIs to try:',
      '  devtools.inspectedWindow',
      '  downloads',
      '  history',
      '  pageCapture',
      '  sessions',
      '  tabCapture',
      '  tabs',
      '  topSites',
      '  webstore',
      '  windows',
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  chromeAgentClient.callApi(api, args)
    .then(function(result) {
      cx.stdout.write(JSON.stringify(result, null, 2) + '\n');
      cx.closeOk();
    }).catch(function(err) {
      cx.closeError(err);
    });
};

export default main;

main.signature = {
  'help|h': '?',
  'method|m': '$',
  'args|a': '*'
};
