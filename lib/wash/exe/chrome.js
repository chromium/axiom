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
  if (!navigator || !/Chrome/.test(navigator.userAgent)) {
    cx.closeError(
        new AxiomError.Incompatible('runtime', 'Supported under Chrome only'));
    return;
  }

  cx.ready();

  var help = cx.getArg('help', false);
  var installAgent = cx.getArg('install-agent', false);
  var apiRef = cx.getArg('api-doc', false);
  var api = cx.getArg('call-api', false);
  var script = cx.getArg('exec-script', false);
  var css = cx.getArg('insert-css', false);
  var timeout = cx.getArg('timeout', null);
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
      '',
      'chrome {--call-api|-a} <API method> [<arg1>...]',
      '  Executes a Chrome Extensions API call on the browser side and',
      '  returns the result. The "chrome." prefix may be omitted. ',
      '  Requires the Chrome Agent extension to be installed.',
      '',
      'chrome {--exec-script|-s} <code> [<tab_id1>...|all]',
      '  Executes a script in the "isolated world" of the specified tab(s),',
      '  returning the result of the last statement of the script.',
      '  If multiple tabs are specified, the results are returned as a map',
      '  with tab IDs as keys.',
      '  Requires the Chrome Agent extension to be installed.',
      '',
      'chrome {--insert-css|-c} <code> [<tab_id1>...|all]',
      '  Injects a CSS fragment into the document of the specified tab(s).',
      '  Requires the Chrome Agent extension to be installed.',
      '',
      'chrome {--api-doc|-d} [<API or API method>]',
      '  Opens the Chrome Extensions API documentation for the given API',
      '  or API method in a new tab. The "chrome." prefix may be omitted.',
      '',
      'chrome --install-agent',
      '  Initiates installation of the Chrome Agent extension by opening its',
      '  Chrome Web Store page in a new tab.',
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
        script ? executeScript_(argv[0], argv.slice(1), timeout) :
        css ? insertCss_(argv[0], argv.slice(1)) :
            Promise.reject(new AxiomError.Runtime('Unreachable'));

    promise
      .then(function(result) {
        if (typeof result !== 'undefined') {
          cx.stdout.write(result + '\n');
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
  'api-doc|d': '?',
  'call-api|a': '?',
  'exec-script|s': '?',
  'insert-css|c': '?',
  'timeout|t': '$',
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
 * @param {number=} opt_timeout
 * @return {!Promise<*>}
 */
var executeScript_ = function(code, tabIds, opt_timeout) {
  return sanitizeTabIds_(tabIds).then(function(sTabIds) {
    return chromeAgentClient.executeScriptInTabs(code, sTabIds, opt_timeout)
        .then(function(tabResults) {
      var result = '';
      for (var tabId in tabResults) {
        result += 'tab ' + tabId + ': ' + tabResults[tabId] + '\n';
      }
      return result;
    });
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
    if (typeof tabIds[i] !== 'number') {
      return Promise.reject(
          new AxiomError.Invalid('tab IDs must be numbers', tabIds));
    }
  }

  return Promise.resolve(tabIds);
};
