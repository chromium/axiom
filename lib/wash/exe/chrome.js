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
import Completer from 'axiom/core/completer';
import chromeAgentClient from 'wash/chrome_agent_client';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @const @private */
var STDIN_ = '\\$STDIN';
/** @const @private */
var STDIN_RE_ = new RegExp(STDIN_);
/** @const @private */
var DEFAULT_TABS_FOR_LIST_ = 'all';
/** @const @private */
var DEFAULT_TIMEOUT_ = 1000;
/** @const @private */
var DEFAULT_RUN_AT_ = 'idle';

var HELP_ = [
  'SYNOPSYS:',
  '',
  'chrome -a|--call-api <API method> [<API arg>...] [OPTIONS]',
  '  Executes a Chrome Extensions API call on the browser side and returns the',
  '  result. The API arguments must be whitespace-separated.',
  '',
  'chrome -s|--exec-script <script> TABS_OPTION [OPTIONS] [SCL_OPTIONS]',
  '  Executes a script in the top frame or all frames of the specified tab(s),',
  '  returning the results as a map {tabId: result/error, ...}.',
  '',
  'chrome -c|--insert-css <css> TABS_OPTION [OPTIONS] [SCL_OPTIONS]',
  '  Injects a CSS fragment into the top frame or all frames of the specified',
  '  tab(s). Returns an empty map if all insertions were successful, or',
  '  a map {tabID: error, ...} in case there were errors.',
  '',
  'chrome -l|--list-tabs [TABS_OPTION] [OPTIONS] [SCL_OPTIONS]',
  '  Prints a compact list of requested tabs\' IDs and titles for',
  '  a quick identification. For a more involved querying and a detailed',
  '  list of tab properties, use:',
  '  `chrome --exec-script tabs.query ...`.',
  '',
  'chrome -d|--api-doc [<API or API method>...]',
  '  Opens the Chrome Extensions API documentation for the given API',
  '  or API method in a new tab.',
  '',
  'chrome --install-agent',
  '  Initiates installation of the Chrome Agent extension by opening its',
  '  Chrome Web Store page in a new tab.',
  '',
  'OPTIONS:',
  '',
  '--timeout <millisec>',
  '  A timeout in milliseconds, defaults to ' + DEFAULT_TIMEOUT_ + 'ms.',
  '  Prevents hanging in presence of rogue tabs, e.g. tabs in the "Aw, snap!"',
  '  state.',
  '',
  '-n|-no-trailing-eol',
  '  Do not print the trailing newline character. Useful when the output',
  '  is piped into another command.',
  '',
  'TABS_OPTION:',
  '',
  '-t|--tabs <tab ID>,...|all|window',
  '  Specifies a set of tabs to apply the action to.',
  '  "all" means "all windows"; "window" means "current window"; if IDs are',
  '  used, they must be comma-separated. Note that for --list-tabs, this',
  '  argument is optional and defaults to "' + DEFAULT_TABS_FOR_LIST_ + '".',
  '',
  'SCL_OPTIONS:',
  '',
  '--all-frames',
  '  Apply action to all frames of every tab specified in --tabs.',
  '  By default, only the top frame is used.',
  '',
  '--run-at start|end|idle',
  '  Specifies at what point during document loading the action is to be',
  '  carried out (e.g. script executed). Default is "' + DEFAULT_RUN_AT_ + '".',
  '  This makes most sense for a batch series of commands, where some commands',
  '  open new tabs and other commands schedule some actions to them while they',
  '  are still loading.',
  '',
  '-p|--pluck <separator>',
  '  By default the output of a multitab action is formatted as a JSON map',
  '  of form { tab ID: tab result,...}. --pluck will instead print just the',
  '  results separated with <separator> (e.g. "\\n").',
  '',
  'ADDITIONAL NOTES:',
  '',
  '1) The "chrome." prefix can be omitted in API names.',
  '2) --call-api, --exec-script, --insert-css and --list-tabs require the',
  '   Chrome Agent extension to be installed. See --install-agent.',
  '3) A script for --exec-script or a CSS fragment for --insert-css can',
  '   use a special pseudo-variable $STDIN in them: it will be replaced by',
  '   the value read from the stdin (e.g. piped from another command or file).',
  '4) A script or a CSS fragment can also be omitted altogether:',
  '   in that case, the entire script/fragment will be read from stdin.',
  '5) If --exec-script or --insert-css encounter any per-tab errors, they are',
  '   reported in the same map as the results (an error replaces the result).'
].join('\r\n') + '\r\n';

/**
 * @param {!JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  // We might need to read from stdin: pause it so no data is lost.
  cx.stdin.pause();

  if (!navigator || !/Chrome/.test(navigator.userAgent)) {
    cx.closeError(
        new AxiomError.Incompatible('runtime', 'Supported under Chrome only'));
    return;
  }

  cx.ready();

  var help = cx.getArg('help', false);
  var installAgent = cx.getArg('install-agent', false);
  var apiDoc = cx.getArg('api-doc', false);
  var api = cx.getArg('call-api', false);
  var list = cx.getArg('list-tabs', false);
  var script = cx.getArg('exec-script', false);
  var css = cx.getArg('insert-css', false);
  var tabIds = cx.getArg('tabs', list ? [DEFAULT_TABS_FOR_LIST_] : []);
  if (!(tabIds instanceof Array)) {
    tabIds = tabIds.toString().split(',');
  }
  var pluck = cx.getArg('pluck', null);
  if (pluck !== null) {
    pluck = pluck.replace('\\n', '\n');
  }

  var argsPromise = (api || script || css) ?
      getFreeArgs(cx) : Promise.resolve(cx.getArg('_', []));

  argsPromise.then(function(freeArgs) {
    // Allow exactly 1 of the mutually exclusive switches and verify the number
    // of free arguments and other dependent switches.
    if (help ||
        (api + apiDoc + list + script + css + installAgent !== 1) ||
        (api && freeArgs.length < 1) ||
        (apiDoc && freeArgs.length < 1) ||
        (list && (freeArgs.length > 0)) ||
        (script && (freeArgs.length !== 1 || tabIds.length < 1)) ||
        (css && (freeArgs.length !== 1 || tabIds.length < 1)) ||
        (installAgent && freeArgs.length > 0)) {
      cx.stdout.write(HELP_);
      cx.closeOk();
      return;
    }

    if (installAgent) {
      chromeAgentClient.installAgent();
      cx.closeOk();
      return;
    }

    if (apiDoc) {
      freeArgs.forEach(function(arg) {
        chromeAgentClient.openApiOnlineDoc(arg.toString());
      });
      cx.closeOk();
      return;
    }

    var options = {
      timeout: /** number */ cx.getArg('timeout', DEFAULT_TIMEOUT_),
      allFrames: /** boolean */ cx.getArg('all-frames', false),
      runAt: /** string */ 'document_' + cx.getArg('run-at', DEFAULT_RUN_AT_)
    };

    var commandPromise =
        api ?    callApi_(freeArgs[0], freeArgs.slice(1), options) :
        list ?   executeScript_('document.title', tabIds, options, pluck) :
        script ? executeScript_(freeArgs[0], tabIds, options, pluck) :
        css ?    insertCss_(freeArgs[0], tabIds, options, pluck) :
                null;

    commandPromise
      .then(function(result) {
        if (typeof result !== 'undefined') {
          if (typeof result === 'object') {
            result = JSON.stringify(result, null, 2);
          }
          cx.stdout.write(result + (cx.getArg('no-trailing-eol') ? '' : '\n'));
        }
        cx.closeOk();
      }).catch(function(error) {
        if (error instanceof chromeAgentClient.ErrorSendingRequest) {
          cx.closeError(new AxiomError.Missing(
              'This command requires Chrome Agent extension to be installed. ' +
              'Rerun with the --install-agent switch to install ' +
              '(' + error.message + ')'));
        } else if (error instanceof chromeAgentClient.ErrorExecutingRequest) {
          cx.closeError(new AxiomError.Runtime(error.message));
        } else {
          cx.closeError(error);
        }
      });
  });
};

export default main;

main.signature = {
  'help|h': '?',
  // Commands:
  'install-agent': '?',
  'api-doc|d': '?',
  'call-api|a': '?',
  'exec-script|s': '?',
  'insert-css|c': '?',
  'list-tabs|l': '?',
  // Options:
  'tabs|t': '*',
  'all-frames': '?',
  'run-at': '$',
  'timeout': '*',
  'pluck|p': '$',
  'no-trailing-eol|n': '?',
  '_': '@'
};

/**
 * @param {!JsExecuteContext} cx
 * @return {!Promise<Array<*>>}
 */
var getFreeArgs = function(cx) {
  var argv = cx.getArg('_', [STDIN_]);
  var needStdin = argv.some(function(arg) { return STDIN_RE_.test(arg); });

  if (!needStdin)
    return Promise.resolve(argv);

  var completer = new Completer();
  var input = '';

  cx.stdin.onData.addListener(function(data) {
    input += data;
  });

  cx.stdin.onEnd.listenOnce(function() {
    // Perform necessary escaping to convert `input` into a string compatible
    // with the downstream.
    input = JSON.stringify(input);
    for (var i = 0; i < argv.length; ++i) {
      argv[i] = argv[i].replace(STDIN_RE_, input);
    }
    completer.resolve(argv);
  });

  // Let the data flow to the handlers.
  cx.stdin.resume();
  
  return completer.promise;
};

/**
 * @param {!string} api
 * @param {!Array<*>} apiArgs
 * @param {!{timeout: number}} options
 * @return {!Promise<*>}
 */
var callApi_ = function(api, apiArgs, options) {
  return chromeAgentClient.callApi(api, apiArgs, options);
};

/**
 * @param {!string} code
 * @param {!Array<number|string>} tabIds
 * @param {!{allFrames: boolean, runAt: string, timeout: number}} options
 * @param {string} pluck Print just the per-tab results separated with this
 *   value, instead of a {tabID: result, ...} map.
 * @return {!Promise<*>}
 */
var executeScript_ = function(code, tabIds, options, pluck) {
  return sanitizeTabIds_(tabIds)
    .then(function(sTabIds) {
      return chromeAgentClient.executeScriptInTabs(code, sTabIds, options)
        .then(function(/** !Object<string, *> */tabResults) {
          return formatTabResults_(tabResults, pluck);
        });
    });
};

/**
 * @param {!string} css
 * @param {!Array<number|string>} tabIds
 * @param {!{allFrames: boolean, runAt: string, timeout: number}} options
 * @param {string} pluck Print just the per-tab results separated with this
 *   value, instead of a {tabID: result, ...} map.
 * @return {!Promise<*>}
 */
var insertCss_ = function(css, tabIds, options, pluck) {
  return sanitizeTabIds_(tabIds)
    .then(function(sTabIds) {
      return chromeAgentClient.insertCssIntoTabs(css, sTabIds, options)
        .then(function(/** !Object<string, *>*/tabResults) {
          return formatTabResults_(tabResults, pluck);
        });
    });
};

/**
 * @param {!Array<number>|string} tabIds
 * @return {!Promise<!(Array<number>|string)>}
 */
var sanitizeTabIds_ = function(tabIds) {
  if (tabIds.length === 1 && (tabIds[0] === 'all' || tabIds[0] === 'window')) {
    return Promise.resolve(tabIds[0]);
  }

  for (var i = 0; i < tabIds.length; ++i) {
    if (typeof tabIds[i] !== 'number') {
      if (isNaN(+tabIds[i])) {
        return Promise.reject(new AxiomError.TypeMismatch(
            '--tabs value must be a list of numbers, a literal \'window\' ' +
                'or a literal \'all\'',
            tabIds)
        );
      }
      tabIds[i] = +tabIds[i];
    }
  }

  return Promise.resolve(tabIds);
};

/**
 * @param {!Array<number|string>} tabIds
 * @return {!boolean}
 */
var isExplicitSingleTab_ = function(tabIds) {
  return tabIds.length == 1 && typeof tabIds[0] === 'number';
};

/**
 * @param {!Object<string, *>} tabResults
 * @param {string} pluck Return just the per-tab results separated with this
 *   value, instead of a {tabID: result, ...} map.
 * @return {*}
 */
var formatTabResults_ = function(tabResults, pluck) {
  if (pluck !== null) {
    var values = [];
    for (var id in tabResults)
      values.push(tabResults[id]);
    return values.join(pluck);
  }
  return tabResults;
};
