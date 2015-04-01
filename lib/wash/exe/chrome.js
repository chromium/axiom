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

var CHROME_USAGE_STRING_ =
    'Usage: chrome [--api-ref|--install-agent]' +
    '<chrome extension API method> [<arg1>...]';

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  if (cx.getArg('install-agent')) {
    chromeAgentClient.installAgent();
    cx.closeOk();
    return;
  }

  var api;
  var args;
  var argv = cx.getArg('_');
  if (argv) {
    api = argv.shift();
    if (!api.startsWith('chrome.'))
      api = 'chrome.' + api;
    args = argv;
  }

  if (cx.getArg('api-ref')) {
    chromeAgentClient.openApiReference(api);
    cx.closeOk();
    return;
  }

  if (!api || cx.getArg('help')) {
    cx.stdout.write([
      CHROME_USAGE_STRING_,
      '',
      'Executes a Chrome Extensions API call on the browser side using a',
      'companion Chrome extension called Axiom Agent, and returns the result.',
      '',
      'For the list of available APIs, run with the --api-ref or -a switch.',
      'API methods can be entered as either chrome.tabs.getCurrent or',
      'tabs.getCurrent.',
      '',
      'Some interesting APIs to explore:',
      '  windows.*',
      '  tabs.*',
      '  sessions.*',
      '  downloads.*',
      '  history.*',
      '  topSites.*',
      '  pageCapture.*',
      '  tabCapture.*'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  chromeAgentClient.callApi(api, args)
    .then(function(result) {
      cx.stdout.write(JSON.stringify(result, null, 2) + '\n');
      cx.closeOk();
    }).catch(function(err) {
      if (AxiomError.Missing.test(err)) {
        cx.stdout.write(
            'This command requires the Chrome Agent extension to be ' +
            'installed. Rerun with the --install-agent switch to install.');
      }
      cx.closeError(err);
    });
};

export default main;

main.signature = {
  'help|h': '?',
  'api-ref': '?',
  'install-agent': '?',
  '_': '@'
};
