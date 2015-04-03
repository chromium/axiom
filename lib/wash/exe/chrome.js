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
      'chrome -a|--call-api <API method> [<arg1>...] [--timeout <ms>]',
      '  Executes a Chrome Extensions API call on the browser side and',
      '  returns the result.',
      '',
      'chrome -s|--exec-script <code> [<tab_id1>...|all] [--timeout <ms>] [--all-frames]',
      '  Executes a script in the top frame or all frames of the specified',
      '  tab(s), returning the result of the last statement of the script.',
      '',
      'chrome -c|--insert-css <css> [<tab_id1>...|all] [--timeout <ms>] [--all-frames]',
      '  Injects a CSS fragment into the top frame or all frames of the',
      '  specified tab(s).',
      '',
      'chrome -d|--api-doc [<API or API method>]',
      '  Opens the Chrome Extensions API documentation for the given API',
      '  or API method in a new tab. The "chrome." prefix may be omitted.',
      '',
      'chrome --install-agent',
      '  Initiates installation of the Chrome Agent extension by opening its',
      '  Chrome Web Store page in a new tab.',
      '',
      'NOTES:',
      '1) The "chrome." prefix may be omitted in API names.',
      '2) --call-api, --exec-script and --insert-css require the Chrome Agent',
      '   extension to be installed. See --install-agent.',
      '3) If multiple tabs are specified, the results are returned as a map',
      '  with tab IDs as keys.'
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
    var options = {
      allFrames: cx.getArg('all-frames', false),
      timeout: cx.getArg('timeout', null),
    };      

    var promise =
        api ?    callApi_(argv[0], argv.slice(1), options) :
        script ? executeScript_(argv[0], argv.slice(1), options) :
        css ?    insertCss_(argv[0], argv.slice(1), options) :
                 null;

    promise
      .then(function(result) {
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
  'api-doc|d': '?',
  'call-api|a': '?',
  'exec-script|s': '?',
  'insert-css|c': '?',
  'all-frames': '?',
  'timeout': '$',
  '_': '@'
};

/**
 * @param {!string} api
 * @param {!Array<*>} args
 * @return {!Promise<*>}
 */
var callApi_ = function(api, args, options) {
  return chromeAgentClient.callApi(api, args, options);
};

/**
 * @param {!string} code
 * @param {!(Array<number|string>)} tabIds
 * @param {number=} opt_timeout
 * @return {!Promise<*>}
 */
var executeScript_ = function(code, tabIds, options) {
  return sanitizeTabIds_(tabIds)
      .then(function(sTabIds) {
    return chromeAgentClient.executeScriptInTabs(code, sTabIds, options)
        .then(function(tabResults) {
      return formatTabResults_(tabResults, isExplicitSingleTab_(tabIds));
    });
  });
};

/**
 * @param {!string} css
 * @param {!(Array<number|string>)} tabIds
 * @return {!Promise<*>}
 */
var insertCss_ = function(css, tabIds, options) {
  return sanitizeTabIds_(tabIds)
      .then(function(sTabIds) {
    return chromeAgentClient.insertCssIntoTabs(css, sTabIds, options)
        .then(function() {
      return formatTabResults_(tabResults, isExplicitSingleTab_(tabIds));
    });
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

/**
 * @param {!(Array<number>|string)} tabIds
 * @return {!boolean}
 */
var isExplicitSingleTab_ = function(tabIds) {
  return tabIds instanceof Array && 
         tabIds.length == 1 && 
         typeof tabIds[0] === 'number';
};

/**
 * @param {!(Array<number>|string)} tabIds
 * @return {!Promise<!(Array<number>|string)>}
 */
var formatTabResults_ = function(tabResults, omitTabIds) {
  if (omitTabIds) {
    var values = 
        Object.keys(tabResults).map(function(id) { return tabResults[id]; });
    return values.length === 1 ? values[0] : values;
  }
  return tabResults;
};
