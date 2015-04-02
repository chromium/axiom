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

  var help = cx.getArg('help', false);
  var installAgent = cx.getArg('install-agent', false);
  var apiRef = cx.getArg('api-ref', false);
  var api = cx.getArg('call-api', false);
  var script = cx.getArg('exec-script', false);
  var css = cx.getArg('insert-css', false);
  var argv = cx.getArg('_', []);

  // Allow exactly 1 of the mutually exclusive switches and verify the number
  // of free arguments.
  if (help ||
      (!!api + !!apiRef + !!script + !!css + !!installAgent != 1) ||
      (api && argv.length < 1) ||
      (apiRef && argv.length > 1) ||
      (script && argv.length < 2) ||
      (css && argv.length < 2) ||
      (installAgent && argv.length > 0)) {
    cx.stdout.write([
      'Usage:',
      '  chrome --call-api|-a <API method> [<arg1>...]',
      '  chrome --exec-script|-s <code> [<tab_id1>...|all]',
      '  chrome --insert-css|-c <code> [<tab_id1>...|all]',
      '  chrome --api-ref|-r <API or API method>',
      '  chrome --install-agent',
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

  if (installAgent) {
    chromeAgentClient.installAgent();
    cx.closeOk();
  } else if (apiRef) {
    chromeAgentClient.openApiReference(argv[0]);
    cx.closeOk();
  } else {
    var promise = 
        api ? callApi_(argv[0], argv.slice(1)) :
        script ? executeScript_(argv[0], argv.slice(1)) :
        css ? insertCss_(argv[0], argv.slice(1)) :
            Promise.reject(new AxiomError.Runtime('Unreachable'));

    promise.then(function(result) {
        if (typeof result !== 'undefined') {
          cx.stdout.write(JSON.stringify(result, null, 2) + '\n');
        }
        cx.closeOk();
      }).catch(function(err) {
        if (AxiomError.Missing.test(err)) {
          cx.closeError(new AxiomError.Missing(
              'This command requires Chrome Agent extension to be installed. ' +
              'Rerun with the --install-agent switch to install.'));
        } else {
          cx.closeError(err);
        }
      });
  }
};

export default main;

main.signature = {
  'help|h': '?',
  'install-agent': '?',
  'api-ref|r': '?',
  'call-api|a': '?',
  'exec-script|s': '?',
  'insert-css|c': '?',
  '_': '@'
};

/**
 * @param {!string} api
 * @param {!Array<*>} args
 * @return {!Promise<*>}
 */
var callApi_ = function(api, args) {
  return chromeAgentClient.callApi(api, args);
};

/**
 * @param {!string} code
 * @param {!(Array<number>|string)} tabIds
 * @return {!Promise<*>}
 */
var executeScript_ = function(code, tabIds) {
  return sanitizeTabIds_(tabIds).then(function(sTabIds) {
    return chromeAgentClient.executeScriptInTabs(code, sTabIds);
  });
};

/**
 * @param {!string} css
 * @param {!(Array<number>|string)} tabIds
 * @return {!Promise<*>}
 */
var insertCss_ = function(css, tabIds) {
  return sanitizeTabIds_(tabIds).then(function(sTabIds) {
    return chromeAgentClient.insertCssIntoTabs(css, sTabIds);
  });
};

/**
 * @param {!(Array<number>|string)} tabIds
 * @return {!Promise<!(Array<number>|string)>}
 */
var sanitizeTabIds_ = function(tabIds) {
  if (tabIds.length === 1 && tabIds[0] === 'all') {
    return Promise.resolve(tabIds[0]);
  }

  for (var i = 0; i < tabIds.length; ++i) {
    if (typeof tabIds[i] !== 'number')
      return Promise.reject(new AxiomError.Invalid('tab IDs', tabIds));
  }

  return Promise.resolve(tabIds);
};
