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
var STDIN_ = '$STDIN';
/** @const @private */
var STDIN_RE_ = new RegExp(STDIN_);

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
  var tabIds = cx.getArg('tabs', list ? ['all'] : []);
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
      cx.stdout.write([
        'Usage:',
        '',
        'chrome -a|--call-api <API method> [<arg1>...] [--timeout <millisec>]',
        '    [-n|-no-trailing-eol]',
        '  Executes a Chrome Extensions API call on the browser side and',
        '  returns the result. The API arguments should be whitespace-separated.',
        '',
        'chrome -s|--exec-script -t|--tabs <tab_id1>,...|all|window <code>',
        '    [--all-frames] [--run-at start|end|idle] [--timeout <millisec>]',
        '    [-p|--pluck <separator>] [-n|-no-trailing-eol]',
        '  Executes a script in the top frame or all frames of the specified',
        '  tab(s), returning the results as a map {tabId: result/error, ...}.',
        '',
        'chrome -c|--insert-css -t|--tabs <tab_id1>,...|all|window <css>',
        '    [--all-frames] [--run-at start|end|idle] [--timeout <millisec>]',
        '    [-p|--pluck <separator>] [-n|-no-trailing-eol]',
        '  Injects a CSS fragment into the top frame or all frames of the',
        '  specified tab(s). If there are any errors, reports them',
        '  as a map {tabId: error, ...}',
        '',
        'chrome -l|--list-tabs -t|--tabs <tab_id1>,...|all|window',
        '    [--all-frames] [--run-at start|end|idle] [--timeout <millisec>]',
        '    [-p|--pluck <separator>] [-n|-no-trailing-eol]',
        '  Prints a compact list of requested tabs\' IDs and titles for',
        '  a quick identification. For a more involved querying and a detailed',
        '  list of tab properties, use:',
        '  `chrome --exec-script tabs.query {OPTIONS}`.',
        '',
        'chrome -d|--api-doc [<API or API method>...]',
        '  Opens the Chrome Extensions API documentation for the given API',
        '  or API method in a new tab.',
        '',
        'chrome --install-agent',
        '  Initiates installation of the Chrome Agent extension by opening its',
        '  Chrome Web Store page in a new tab.',
        '',
        'Notes:',
        '',
        '1) The "chrome." prefix can be omitted in API names.',
        '2) --call-api, --exec-script and --insert-css require the',
        '   Chrome Agent extension to be installed. See --install-agent.',
        '3) The --timeout value is in milliseconds. The default is 1000ms.',
        '4) The --run-at option specifies at what point during document',
        '   loading the script is to be executed or CSS is to be inserted.',
        '5) If a list of tabs is given to --exec-script or --insert-css,',
        '   it must be comma-separated.',
        '6) A script for --exec-script or a CSS fragment for --insert-css can',
        '   use a special pseudo-variable $STDIN in them, which will be',
        '   replaced by the value read from the stdin (e.g. piped in from',
        '   another command or redirected from a file).',
        ' 7) A script or a CSS fragment can also be omitted altogether:',
        '    in that case, the entire script/fragment will be read from stdin.'
      ].join('\r\n') + '\r\n');
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
      timeout: /** number */ cx.getArg('timeout', 1000),
      allFrames: /** boolean */ cx.getArg('all-frames', false),
      runAt: /** string */ 'document_' + cx.getArg('run-at', 'idle')
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
          cx.closeError(new AxiomError.Runtime(error));
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
 * @param {!Array<*>} args
 * @param {!{timeout: number}} options
 * @return {!Promise<*>}
 */
var callApi_ = function(api, args, options) {
  return chromeAgentClient.callApi(api, args, options);
};

/**
 * @param {!string} code
 * @param {!Array<number|string>} tabIds
 * @param {!{allFrames: boolean, runAt: string, timeout: number}} options
 * @param {boolean} pluck
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
 * @param {boolean} pluck
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
 * @param {boolean} pluck
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
