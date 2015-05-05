define("wash/chrome_agent_client", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var chromeAgentClient = {};
  __es6_export__("chromeAgentClient", chromeAgentClient);
  __es6_export__("default", chromeAgentClient);

  /**
   * @constructor
   */
  chromeAgentClient.ErrorSendingRequest = function(message) {
    this.message = message;
  };

  /**
   * @constructor
   */
  chromeAgentClient.ErrorExecutingRequest = function(message) {
    this.message = message;
  };

  chromeAgentClient.AGENT_APP_ID_ = 'lfbhahfblgmngkkgbgbccedhhnkkhknb';
  chromeAgentClient.AGENT_INSTALL_URL_ =
      'https://chrome.google.com/webstore/detail/' +
      chromeAgentClient.AGENT_APP_ID_;

  /**
   * Open a new tab with the Agent extension's page in Chrome Web Store,
   * allowing the user to install it.
   *
   * @return {void}
   */
  chromeAgentClient.installAgent = function() {
    window.open(chromeAgentClient.AGENT_INSTALL_URL_);
  };

  /**
   * Open a new tab with the official documentation for the given
   * Chrome Extensions API, or the top page of the documentation if no API is
   * provided.
   *
   * @param {string} api
   * @return {void}
   */
  chromeAgentClient.openApiOnlineDoc = function(api) {
    var urlSuffix = 'api_index';
    if (api) {
      var parts = api.split('.');
      if (parts[0] === 'chrome')
        parts.shift();

      if (parts.length == 1)
        urlSuffix = parts[0];
      else if (parts.length == 2)
        urlSuffix = parts[0] + '#method-' + parts[1];
      else if (parts.length === 3)
        urlSuffix = parts[0] + '_' + parts[1] + '#method-' + parts[2];
    }
    var url = 'https://developer.chrome.com/extensions/' + urlSuffix;
    window.open(url);
  };

  /**
   * Request the Agent extension to invoke the given API with the given arguments
   * and options. The result of the invocation is passed back asynchronously.
   * 
   * @param {!string} api
   * @param {!Array<*>} args
   * @param {!{timeout: number}} options
   * @return {!Promise<*>} Result returned by the API.
   */
  chromeAgentClient.callApi = function(api, args, options) {
    if (!/^chrome./.test(api))
      api = 'chrome.' + api;
    return chromeAgentClient.sendRequest_(
      {
        type: 'call_api',
        api: api,
        args: args,
        options: options
      }
    );
  };

  /**
   * Request the Agent extension to execute a script in the given tabs' 
   * "isolated world" (with full access to the DOM context but not the
   * JavaScript context).
   * 
   * The result of the executions is passed back as a single value for a single
   * requested tab, or as a map of form { tabId1: result1, ... } for multiple
   * requested tabs (special values 'all' and 'window' are considered multiple
   * tabs even if they resolve to just one).
   * 
   * The execution is resilient to errors and/or timeouts in individual tabs,
   * which can happen for various reasons (the script itself never returns or
   * attempts to return too much data; a tab may be hung ("Aw, snap!"); a tab may
   * be a special chrome:// tab, in which scripts are prohibited and error out).
   * Such errors are returned in the results map as special string values.
   *
   * Request the Agent extension to execute the given script in the given list
   * of tabs, with the given options. The result of the executions is passed back 
   * as a single value for a single requested tab, or as a map of form
   * { tabId1: result1, ... } for multiple requested tabs (special values 'all'
   * and 'window' are considered multiple tabs even if they resolve to just one).
   *
   * @param {!string} code
   * @param {!(Array<number>|string)} tabIds
   * @param {!{allFrames: boolean, runAt: string, timeout: number}} options
   * @return {!Promise<*>} Result returned by the API.
   */
  chromeAgentClient.executeScriptInTabs = function(code, tabIds, options) {
    return chromeAgentClient.sendRequest_(
      {
        type: 'execute_script',
        tabIds: tabIds,
        code: code,
        options: options
      }
    );
  };

  /**
   * Request the Agent extension to insert the given CSS fragment into the given
   * list of tabs, with the given options. If there are any errors, they are
   * returned as a single string for a single requested tab, or as a map of form
   * { tabId1: error1, ... } for multiple requested tabs (special values 'all'
   * and 'window' are considered multiple tabs even if they resolve to just one).
   * 
   * Note that the author styles take precedence over any iserted styles, so
   * if there is a clash for some setting, the inserted CSS will have no effect
   * (this is the limitation of the underlying Chrome API).
   *
   * @param {!string} css
   * @param {!(Array<number>|string)} tabIds
   * @param {!{allFrames: boolean, runAt: string, timeout: number}} options
   * @return {!Promise<*>} Result returned by the API.
   */
  chromeAgentClient.insertCssIntoTabs = function(css, tabIds, options) {
    return chromeAgentClient.sendRequest_(
      {
        type: 'insert_css',
        tabIds: tabIds,
        css: css,
        options: options
      }
    );
  };

  /**
   * Send the given request to perform some service to the Agent extension and
   * return back the result.
   *
   * @param {!Object<string, *>} request
   * @return {!Promise<*>} Result returned by the API.
   */
  chromeAgentClient.sendRequest_ = function(request) {
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage(
        chromeAgentClient.AGENT_APP_ID_,
        request,
        {}, // options
        function(response) {
          if (chrome.runtime.lastError) {
            reject(new chromeAgentClient.ErrorSendingRequest(
                chrome.runtime.lastError.message));
          } else if (!response.success) {
            reject(new chromeAgentClient.ErrorExecutingRequest(response.error));
          } else {
            resolve(response.result);
          }
        }
      );
    });
  };
});

//# sourceMappingURL=chrome_agent_client.js.map
define(
  "wash/exe/cat",
  ["axiom/core/error", "axiom/core/completer", "axiom/fs/path", "exports"],
  function(axiom$core$error$$, axiom$core$completer$$, axiom$fs$path$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Completer;
    Completer = axiom$core$completer$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();

      if (cx.getArg('help')) {
        cx.stdout.write([
          'usage: cat [<file>|-]...',
          '',
          'Reads files sequentially, writing them to the standard output.',
          'The file operands are processed in command-line order.',
          '',
          'If file is a single dash (`-`) or absent, cat reads from the standard',
          'input.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      // If no command line arguments were provided, default to 'read from stdin'.
      var list = cx.getArg('_', ['-']);
      var errors = false;
      var stdinReader = new Completer();

      if (list.indexOf('-') !== -1) {
        var stdinInput = '';
        cx.stdin.pause();
        cx.stdin.onData.addListener(function(data) {
          stdinInput += data;
        });
        cx.stdin.onEnd.listenOnce(function() {
          stdinReader.resolve(stdinInput);
        });
        cx.stdin.onClose.listenOnce(function(error) {
          stdinReader.reject(error);
        });
        cx.stdin.resume();
      }

      var catNext = function() {
        if (!list.length) {
          return null;
        }

        /** @type {Promise} */
        var promise;
        /** @type {string} */
        var pathSpec = list.shift();

        if (pathSpec === '-') {
          promise = stdinReader.promise;
        } else {
          // TODO(ussuri): Switch to ReadableFileStreamBuffer.
          promise = cx.fileSystemManager.readFile(Path.abs(cx.getPwd(), pathSpec))
            .then(function(result) {
              return result.data;
            });
        }

        return promise
          .catch(function(error) {
            errors = true;
            cx.stderr.write('cat: ' + error.toString() + '\n');
            return '';
          }).then(function(data) {
            cx.stdout.write(data);
            return catNext();
          });
      };

      catNext().then(function() {
        if (errors) {
          cx.closeError(new AxiomError.Runtime('cat: Some files could not be read'));
        } else {
          cx.closeOk();
        }
      });
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'help|h': '?',
      "_": '@'
    };
  }
);

//# sourceMappingURL=cat.js.map
define(
  "wash/exe/chrome",
  ["axiom/core/error", "axiom/core/completer", "wash/chrome_agent_client", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$completer$$,
    wash$chrome_agent_client$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Completer;
    Completer = axiom$core$completer$$["default"];
    var chromeAgentClient;
    chromeAgentClient = wash$chrome_agent_client$$["default"];

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

    var main = function(cx) {
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

    __es6_export__("main", main);
    __es6_export__("default", main);

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
  }
);

//# sourceMappingURL=chrome.js.map
define(
  "wash/exe/clear",
  ["wash/termcap", "exports"],
  function(wash$termcap$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var Termcap;
    Termcap = wash$termcap$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();
      if (cx.getArg('help')) {
        cx.stdout.write([
          'usage: clear',
          'Clear the terminal.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      var tc = new Termcap();
      var output = tc.output('%clear-terminal()%set-row-column(row, column)',
                             {row: 1, column: 1});
      cx.stdout.write(output);
      cx.closeOk();
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'help|h': '?'
    };
  }
);

//# sourceMappingURL=clear.js.map
define(
  "wash/exe/cp",
  ["axiom/core/error", "axiom/fs/path", "exports"],
  function(axiom$core$error$$, axiom$fs$path$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      if (list.length != 2 || cx.getArg('help')) {
        cx.stdout.write([
          'usage: cp <source-file> <destination-file>',
          'Copy source file to destination file.',
          '',
          'If the destination file is a directory, the source file will be copied',
          'using the same name.  This doe not support recursive directory copies',
          'or multiple source files as of yet.',
          '',
          'If both locations are on the same file system this will try to perform ',
          'an atomic native copy, if available, which will preserve the file\'s ',
          'native format and most of its attributes, such as permissions.  ',
          'If not, the command will read the contents of the source file, ',
          'possibly with format conversion, and write it to a newly created ',
          'destination file.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      /** @type {string} */
      var fromPathSpec = list[0];
      /** @type {string} */
      var toPathSpec = list[1];
      /** @type {string} */
      var pwd = cx.getPwd();

      /** @type {Path} */
      var fromPath = Path.abs(pwd, fromPathSpec);
      /** @type {Path} */
      var toPath = Path.abs(pwd, toPathSpec);

      cx.fileSystemManager.copy(fromPath, toPath)
        .then(function() {
          cx.closeOk();
        }).catch(function(err) {
          cx.closeError(err);
        });
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'help|h': '?',
      '_': '@'
    };
  }
);

//# sourceMappingURL=cp.js.map
define("wash/exe/echo", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

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

  /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
  var JsExecuteContext;

  var help = [
    'Usage: echo <options> ...',
    '',
    'Options:',
    '',
    '  --no-p, --no-pluck',
    '      Always print the arguments as an array, even if there is only one.',
    '  -h, --help',
    '      Print this help message and exit.',
    '  -s, --space <string>',
    '      Specify the whitespace used in array and object literals.  Defaults',
    '      to "  ".',
    '  -n, --no-eol',
    '      Do not print the trailing newline character.',
    '',
    'Serializes the arguments using JSON.stringify and echos them to stdout.'
  ];

  var main = function(cx) {
    cx.ready();

    if (cx.getArg('help', false)) {
      cx.stdout.write(help.join('\r\n') + '\r\n');
      cx.closeOk();
      return;
    }

    var list = cx.getArg('_', ['']);
    var value;

    if (list.length == 1 && cx.getArg('pluck', true)) {
      value = list[0];
    } else {
      value = list;
    }

    if (typeof value === 'object') {
      value = JSON.stringify(value, null, cx.getArg('space', '  '));
    }

    cx.stdout.write(value + (cx.getArg('no-eol', false) ? '' : '\n'));

    cx.closeOk();
  };

  __es6_export__("main", main);
  __es6_export__("default", main);

  main.signature = {
    '_': '@',
    'help|h': '?',
    'pluck|p': '?',
    'space|s': '$',
    'no-eol|n': '?'
  };
});

//# sourceMappingURL=echo.js.map
define(
  "wash/exe/eval",
  ["axiom/core/error", "axiom/core/completer", "axiom/core/ephemeral", "wash/termcap", "wash/wash_util", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$completer$$,
    axiom$core$ephemeral$$,
    wash$termcap$$,
    wash$wash_util$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Completer;
    Completer = axiom$core$completer$$["default"];
    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];
    var Termcap;
    Termcap = wash$termcap$$["default"];
    var washUtil;
    washUtil = wash$wash_util$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    /**
     * @constructor
     * A partial clone of GNU jsEval.
     *
     * @param {JsExecuteContext} executeContext
     */
    var Eval = function(executeContext) {
      this.executeContext = executeContext;

      /**
       * @private @type {Termcap}
       */
      this.tc_ = new Termcap();

      this.exit = false;

      this.promptString_ = executeContext.getArg('prompt-string', '');
      this.promptVars_ = null;

      this.inputHistory = [];
    };

    var main = function(cx) {

      cx.ready();

      var jsEval = new Eval(cx);

      // TODO(grv): implement input-history for eval command.
      jsEval.inputHistory = cx.getArg('input-history', []);

      jsEval.setPrompt();

      jsEval.readEvalPrintLoop().then(function(value) {
        cx.closeOk(value);
      }).catch(function(err) {
        cx.closeError(err);
      });
    };

    __es6_export__("main", main);

    /**
     * Read-eval-print-loop.
     *
     * @return {Promise<*>} Resolves to the value of the final evaluation.
     */
    Eval.prototype.readEvalPrintLoop = function() {
      return this.readEvalPrint('').then(
        function(value) {
          if (this.exit) {
            return Promise.resolve();
          }
          if (this.executeContext.isEphemeral('Ready'))
            return this.readEvalPrintLoop();

          return Promise.resolve(value);
        }.bind(this)
      ).catch(
        function(value) {
          return Promise.reject(value);
        }.bind(this)
      );
    };

    /**
     * Read a single line of input, eval it, print the result or an error.
     *
     * @return {Promise<*>} Resolves to result of the evaluation.
     */
    Eval.prototype.readEvalPrint = function(inputString) {
      var input = inputString;
      var promptString = this.promptString_;

      if (inputString !== '') {
        promptString = '';
      }

      return this.read(promptString).then(
        function(result) {
          if (result === null || result === 'exit') {
              this.exit = true;
            return Promise.resolve();
          }

          if (typeof result != 'string') {
            return Promise.reject(new AxiomError.Runtime(
                'Unexpected type from readline: ' + (typeof result)));
          }

          input += result;
          return this.evaluate(input).then(
            function(value) {
              if (typeof value !== 'undefined' && value !== null) {
                this.executeContext.stdout.write(value + '\n');
              }
              return Promise.resolve(value);
            }.bind(this));
        }.bind(this)
      ).catch(
        function(error) {
          // We currently do not support multi line input in readline. This is a
          // proxy to find if the error is a syntax error in code or the user has
          // not finished typing. The error here checked is returned by the eval
          // javascript function.
          // TODO(grv): Do a better detection of syntax error vs incomplete code.
          if (error && error.message == 'Unexpected end of input') {
            return this.readEvalPrint(input);
          } else if (error) {
            this.executeContext.stdout.write('Error: ' + error.message + '\n');
          } else {
            this.executeContext.stdout.write(
              'Error in evaluating input:' + input + '\n');
          }

          return Promise.resolve();
        }.bind(this)
      );
    };

    /**
     * @param {string} promptString
     * @return {!Promise<*>}
     */
    Eval.prototype.read = function(promptString) {
      return washUtil.findExecutable(this.executeContext, 'readline').then(
        function(result) {
          return this.executeContext.call(
              result.path,
              { 'prompt-string': promptString,
                'input-history': this.inputHistory
              });
        }.bind(this));
    };

    /**
     * @param {string} input
     * @return {Promise<*>}
     */
    Eval.prototype.evaluate = function(input) {
      try {
        var value = eval(input);
        return Promise.resolve(value);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    main.signature = {
      'input-history': '@',
      'prompt-string|p': '$'
    };

    /**
     * @return {void}
     */
    Eval.prototype.setPrompt = function() {
      this.promptString_ = this.tc_.output(
          '%set-attr(FG_BOLD, FG_CYAN) eval>  %set-attr()');
    };

    __es6_export__("default", main);
  }
);

//# sourceMappingURL=eval.js.map
define(
  "wash/exe/import",
  ["axiom/core/error", "axiom/core/completer", "axiom/fs/data_type", "axiom/fs/path", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$completer$$,
    axiom$fs$data_type$$,
    axiom$fs$path$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Completer;
    Completer = axiom$core$completer$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
    var ExecuteContext;

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    var main = function(cx) {
      cx.ready();

      /** @type {Array<string>} */
      var list = cx.getArg('_', []);

      /** @type {boolean} */
      var forceSingleFile = cx.getArg('file');

      if (list.length > 1 || cx.getArg('help')) {
        cx.stdout.write([
          'usage: import [<target-directory>] [-d|--dialog [-f|--file]]',
          'Import a directory from the local file system.',
          '',
          'If <target-directory> is provided, the file(s) will be imported there.',
          'If not, they will be imported into the current directory.',
          '',
          'If -d is provided, a browser file-upload dialog is used instead of',
          'HTML5 drag-and-drop features.',
          '',
          'Imports a directory by default (if supported by browser).  If -f is',
          'provided, only a single file is imported.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      /** @type {string} */
      var pathSpec = list.length ? list.shift() : '.';
      /** @type {string} */
      var pwd = cx.getPwd();
      /** @type {Path} */
      var path = Path.abs(pwd, pathSpec);

      /** @type {ImportCommand} */
      var command = new ImportCommand(cx);

      // NOTE: cx will get closed in ImportCommand.prototype.handleFileSelect_().
      command.import(path, forceSingleFile);
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'dialog|d': '?',
      'file|f': '?',
      'help|h': '?',
      '_': '@'
    };

    /**
     * @constructor
     * Import a directory of files for use in wash.
     *
     * @param {ExecuteContext} executeContext
     */
    var ImportCommand = function(cx) {
      /** @type {Path} The target directory of the import*/
      this.destination = null;

      /** @private @type {ExecuteContext} */
      this.cx_ = cx;

      /** @private @type {FileSystemManager} */
      this.fsm_ = cx.fileSystemManager;

      /** @type {Element} An element which, if we return focus to it, will tell us
                          that the user has canceled the import. */
      this.dummyFocusInput_ = null;

      /** @type {Element} The file / directory chooser input. */
      this.input_ = null;

      /** @private @type {?boolean} Force import of single file */
      this.singleFile_ = null;

      /** @type {Element} The originally focused element to restore. */
      this.originalFocusElement_ = null;

      /** @type {boolean} Files have been selected (remove cancel handler). */
      this.filesChosen_ = false;

      /** @type {Element} Drop overlay for files */
      this.dropArea_ = null;

      /** @type {number} */
      this.fileCount_ = 0;

      /** @type {number} */
      this.directoryCount_ = 0;

      /** @type {Array} */
      this.errors_ = [];


      // Localize the handlers so we can remove it later.
      this.handleFileCancel_ = this.handleFileCancel_.bind(this);
      this.handleDropCancel_ = this.handleDropCancel_.bind(this);
      this.handleDrop_ = this.handleDrop_.bind(this);
      this.handleDragOver_ = this.handleDragOver_.bind(this);
    };

    /**
     * Prompt the user to import a directory or file
     *
     * @param {Path} Destination path
     * @param {boolean} Import single file
     * @return {void}
     */
    ImportCommand.prototype.import = function(destination, forceSingleFile) {
      this.destination = destination;
      this.singleFile_ = forceSingleFile;
      this.originalFocusElement_ = document.activeElement;
      this.dummyFocusInput_ = document.createElement('input');

      this.dummyFocusInput_.setAttribute('type', 'text');
      document.body.appendChild(this.dummyFocusInput_);
      this.dummyFocusInput_.focus();

      /** @type {Element} */
      var input = document.createElement('input');
      input.setAttribute('type', 'file');
      if (!forceSingleFile) {
        input.setAttribute('webkitdirectory', '');
        input.setAttribute('multiple', '');
      }

      input.style.cssText =
          'position: absolute;' +
          'right: 0';

      this.input_ = input;

      input.addEventListener('change', this.handleFileSelect_.bind(this), false);

      document.body.appendChild(input);

      if (this.cx_.getArg('dialog')) {
        input.click();

        // Cancellation is detected by creating a text field and giving it focus.
        // When the field gets focus again, and the `change` handler (above) hasn't
        // fired, we know that a cancel happened.
        this.dummyFocusInput_.addEventListener('focus', this.handleFileCancel_, false);
      } else {
        this.setOverlayVisible_(true);
      }
    };

    /**
     * Mkdir, including parent directories
     * @private
     * @param {Path} path
     * @return {Promise}
     */
    ImportCommand.prototype.mkdirParent_ = function(path) {
      var parentPath = path.getParentPath();
      if (parentPath === null) return Promise.resolve(null);
      return this.mkdirParent_(parentPath).then(function() {
        this.directoryCount_++;
        return this.fsm_.mkdir(path).catch(function (e) {
          this.directoryCount_--;
          if (AxiomError.Duplicate.test(e)) {
            return Promise.resolve();
          }
          return Promise.reject(e);
        }.bind(this));
      }.bind(this));
    };

    /**
     * Set the overlay to visible or hidden.
     *
     * @private
     * @param {boolean} visible
     * @return {void}
     */
    ImportCommand.prototype.setOverlayVisible_ = function(visible) {
      if ((this.dropArea_ !== null) == visible) return;

      /** @type {Element} */
      var docElement = document.documentElement;

      /** @type {Element} */
      var overlay = this.cx_.stdio['overlay'];

      if (!overlay) {
        this.cx_.closeError(new AxiomError.Runtime(
            'Overlay cannot be found on stdio (required for drag-and-drop import)'));    
      }

      if (!visible) {
        overlay.removeChild(this.dropArea_);
        overlay.style.visibility = 'hidden';
      } else {
        overlay.style.visibility = 'visible';
        overlay.style.width = '100%';
        overlay.style.height = '100%';

        /** @type {Element} */
        var dropArea = document.createElement('div');
        this.dropArea_ = dropArea;
        dropArea.style.border = '10px dashed #bbb';
        dropArea.style.width = 'calc(100% - 100px)';
        dropArea.style.height = 'calc(100% - 100px)';
        dropArea.style.borderRadius = '25px';
        dropArea.style.margin = '40px';
        overlay.appendChild(dropArea);

        /** @type {Element} */
        var dropLabel = document.createElement('div');

        dropLabel.style.cssText = (
          'font: 47px arial, sans-serif;' +
          'color: #ddd;' +
          'height: 100%;' +
          'width: 100%;' +
          'text-align: center;' +
          /* Internet Explorer 10 */
          'display:-ms-flexbox;' +
          '-ms-flex-pack:center;' +
          '-ms-flex-align:center;' +
          /* Firefox */
          'display:-moz-box;' +
          '-moz-box-pack:center;' +
          '-moz-box-align:center;' +
          /* Safari, Opera, and Chrome */
          'display:-webkit-box;' +
          '-webkit-box-pack:center;' +
          '-webkit-box-align:center;' +
          /* W3C */
          'display:box;' +
          'box-pack:center;' +
          'box-align:center;');

        dropArea.appendChild(dropLabel);
        dropLabel.appendChild(document.createTextNode("Drop Files Here"));
        dropLabel.appendChild(document.createElement('br'));

        /** @type {Element} */
        var cancelButton = document.createElement('span');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = (
          'border: 3px solid #ccc;' +
          'border-radius: 12px;' +
          'background: #222;' +
          'padding: 5px 10px 5px 10px;' +
          'cursor: default;' +
          'font-size: 24px;');
        dropLabel.appendChild(cancelButton);
        cancelButton.addEventListener('click', this.handleDropCancel_);
        dropArea.ondragover = this.handleDragOver_;
        dropArea.ondrop = this.handleDrop_;
      }
    }

    /**
     * Handle dragging files over dropArea.
     *
     * @private
     * @param {Event} event
     * @return {boolean}
     */
    ImportCommand.prototype.handleDragOver_ = function(event) {
      return false;
    }

    /**
     * Handle dropping of files for import.
     *
     * @private
     * @param {Event} event
     * @return {boolean}
     */
    ImportCommand.prototype.handleDrop_ = function(event) {
      event.preventDefault && event.preventDefault();

      /** @type {Array<DataTransferItem>} */
      var items = event.dataTransfer.items;

      /** @type {!Array<Promise>} */
      var traversalPromises = [];

      /** @type {Path} */
      var path = new Path(this.destination.spec);
      Promise.resolve().then(function(hasTarget) {
        if (this.destination.spec != Path.abs(this.cx_.getPwd(), '.').spec) {
          this.directoryCount_++;
          return this.fsm_.mkdir(path).catch(function (error) {
            this.directoryCount_--;
            if (AxiomError.Duplicate.test(error)) {
              return Promise.resolve(null);
            }
            return Promise.reject(error);
          }.bind(this));
        }
      }.bind(this)).then(function() {
        if (items) {
          for (var i = 0; i < items.length; i++) {
            /** @type {?Entry} */
            var item = items[i].webkitGetAsEntry();

            traversalPromises.push(this.traverseEntries_(item, ''));
          }

          Promise.all(traversalPromises)
              .then(this.handleFileLoadsCompletion_.bind(this));
        } else {
          this.importFileList_(event.dataTransfer.files);
        }
      }.bind(this));

      return false;
    }

    /**
     * Traverse a tree of files.
     *
     * @private
     * @param {Entry} entry
     * @param {string} path
     * @return {Promise<Array<File>>}
     */
    ImportCommand.prototype.traverseEntries_ = function(entry, pathString){
      /** @type {Completer} */
      var fileCompleter = new Completer();

      /** @type {string} */
      var directoryPathString = (pathString ? pathString + '/' : '') + entry.name;

      /** @type {Path} */
      var path = Path.abs(this.destination.spec, directoryPathString);

      if (entry.isFile) {
        entry.file(function(file) {
          this.importFile_(file, pathString + '/' + file.name).then(function() {
            fileCompleter.resolve(null);
          }.bind(this));
        }.bind(this), function(error) {
          this.errors_.push(error);
          fileCompleter.resolve(null);
        }.bind(this));
      } else if (entry.isDirectory) {
        this.fsm_.mkdir(path).catch(function (error) {
          this.directoryCount_--;
          if (AxiomError.Duplicate.test(error)) {
            return Promise.resolve(null);
          }
          return Promise.reject(error);
        }.bind(this)).then(function () {
          this.directoryCount_++;
          var dirReader = entry.createReader();
          dirReader.readEntries(function(entries) {
            /** @type {!Array<File>} */
            var files = [];

            /** @type {!Array<Promise>} */
            var traversalPromises = [];

            for (var i = 0; i < entries.length; i++) {
              traversalPromises.push(this.traverseEntries_(entries[i],
                  directoryPathString).then(function(traversedFiles) {
                files.concat(traversedFiles);
                return Promise.resolve(files.concat(traversedFiles));
              }).then(function() {
                return null;
              }).catch(function(e) {
                return e;
              }));
            }

            Promise.all(traversalPromises).then(function(values) {
              fileCompleter.resolve(null);
            })
          }.bind(this), function(error) {
            this.errors_.push(error);
            fileCompleter.resolve(null);
          }.bind(this));
        }.bind(this)).catch(function(error) {
          this.errors_.push(error);
          fileCompleter.resolve(null);
        }.bind(this));
      } 
      return fileCompleter.promise;
    }

    /**
     * Handle the cancelation of drop overlay.
     *
     * @private
     * @param {Event} evt
     * @return {void}
     */
    ImportCommand.prototype.handleDropCancel_ = function(evt) {
      this.setOverlayVisible_(false);
      this.handleFileCancel_(null);
    }

    /**
     * Handle the cancelation of choosing a file / directory.
     *
     * @private
     * @param {?Event} evt
     * @return {void}
     */
    ImportCommand.prototype.handleFileCancel_ = function(evt) {
      // This handles a race condition between the cancel and select events which
      // cause spurious results This keeps things in the right order (100ms is
      // probably overkill, but mostly undetectable).
      setTimeout(function() {
        if (this.filesChosen_) return;
        this.destroy_();
        this.cx_.closeError(new AxiomError.Missing('file selection'));    
      }.bind(this), 500);
    }

    /**
     * Handle the selection of a file on this.input_
     *
     * @private
     * @param {Event} evt
     * @return {void}
     */
    ImportCommand.prototype.handleFileSelect_ = function(evt) {
      this.filesChosen_ = true;

      this.importFileList_(evt.target.files);
    };

    /**
     * Import a FileList of Files
     *
     * @private
     * @param {FileList} fileList
     * @return {void}
     */
    ImportCommand.prototype.importFileList_ = function(fileList) {
      /** @type {!Array<Promise>} */
      var copyPromises = [];

      for (var i = 0; i < fileList.length; i++) {
        /** @type {!File} */
        var file = fileList[i];

        /** @type {string} */
        var relativePath =
            /** @type {!{webkitRelativePath: string}} */(file).webkitRelativePath;

        if (!relativePath) {
          relativePath = /** @type {{name: string}} */(file).name;
        }

        copyPromises.push(this.importFile_(file, relativePath));
      }

      Promise.all(copyPromises).then(this.handleFileLoadsCompletion_.bind(this));
    };

    /**
     * Import a file into the filesystem at path.
     *
     * @private
     * @param {File} File entry
     * @param {string} Target file path
     * @return {Promise}
     */
    ImportCommand.prototype.importFile_ = function(file, pathString) {
      /** @type {Path} File path */
      var path = Path.abs(this.destination.spec, pathString);

      /** @type {FileReader} */
      var reader = new FileReader();

      /** @type {Completer} */
      var fileCompleter = new Completer();

      /** @type {{path:Path, completer:Completer}} */
      var data = {
        path: path,
        completer: fileCompleter
      };

      reader.onload = this.handleFileLoad_.bind(this, data);

      reader.readAsBinaryString(file);

      return fileCompleter.promise;
    }

    /**
     * Handle loaded file data.
     *
     * @private
     * @param {{path:Path, completer:Completer}} File data
     * @param {Event} Load event
     * @return {Promise}
     */
    ImportCommand.prototype.handleFileLoad_ = function(data, evt) {
      /** @type {ArrayBuffer|Blob|string} */
      var fileContent = evt.target.result;

      /** @type {Path} */
      var path = data.path;

      /** @type {Completer} */
      var fileCompleter = data.completer;

      var parentDirectory = path.getParentPath();
      this.fsm_.stat(parentDirectory).catch(function(e) {
        if (AxiomError.NotFound.test(e)) {
          return this.mkdirParent_(parentDirectory);
        }
        return Promise.reject(e);
      }.bind(this)).then(function(result) {
        return this.fsm_.writeFile(path, DataType.Value, fileContent);
      }.bind(this)).then(function() {
        this.fileCount_++;
        fileCompleter.resolve(null);
      }.bind(this)).catch(function(error) {
        this.errors_.push(error);
        fileCompleter.resolve(null);
      }.bind(this));
    };

    /**
     * Handle file loads.
     *
     * @private
     * @param {Array} Load completions
     * @return {Promise}
     */
    ImportCommand.prototype.handleFileLoadsCompletion_ = function(completions) {

      // completions = completions.reduce(function(a, b) { return a.concat(b)});

      this.destroy_();

      var filesText = 
      this.cx_.stdout.write('Imported ' +
          this.fileCount_ + ' ' + ((this.fileCount_ == 1) ? 'file' : 'files') + ' and ' +
          this.directoryCount_ + ' ' + ((this.directoryCount_ == 1) ? 'directory' : 'directories') +
          ' successfully.\n');
      this.setOverlayVisible_(false);
      var failures = this.errors_.length;

      if (failures === 0) {
        this.cx_.closeOk();
      } else {
        this.cx_.stderr.write(failures + ' ' +
          ((failures == 1) ? 'file' : 'files') + ' failed to import.\n');
        this.cx_.closeError(new AxiomError.Unknown(this.errors_));
      }
    };

    /**
     * Cleanup after command finishes
     *
     * @private
     * @return {void}
     */
    ImportCommand.prototype.destroy_ = function() {
      if (this.input_) {
        document.body.removeChild(this.input_);
        this.input_ = null;
      }
      if (this.dummyFocusInput_) {
        document.body.removeChild(this.dummyFocusInput_);
        this.dummyFocusInput_ = null;
      }

      // TODO(umop): Fix focus issue
      // Return focus to the `activeElement` which is the iframe with `hterm` in it.
      // This causes the cursor to lose its focus style (hollow cursor instead of
      // block cursor), but does not actually cause the terminal to lose focus.
      this.originalFocusElement_.focus();
    }
  }
);

//# sourceMappingURL=import.js.map
define(
  "wash/exe/ls",
  ["axiom/core/error", "axiom/fs/path", "wash/string_utils", "exports"],
  function(axiom$core$error$$, axiom$fs$path$$, wash$string_utils$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var zpad;
    zpad = wash$string_utils$$["zpad"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    /**
     * @param {!StatResult} stat
     */
    var formatStat = function(stat) {
      var keys = Object.keys(stat).sort();

      if (stat.mode == Path.Mode.X) {
        keys = ['signature'];
      } else if (stat.mode ^ Path.Mode.X) {
        keys = keys.filter(function(n) { return n !== 'signature'; });
      }

      var ary = [];
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = stat[key];

        if (key == 'mtime') {
          var d = new Date(stat.mtime);
          value = d.getFullYear() + '-' +
              zpad(d.getMonth() + 1, 2) + '-' +
              zpad(d.getDay(), 2) + ' ' +
              d.toLocaleTimeString();
        } else if (key == 'mode') {
          value = Path.modeIntToString(stat.mode);
        }

        ary.push(key + ': ' + JSON.stringify(value));
      }

      return ary.join(', ');
    };

    var main = function(cx) {
      cx.ready();

      if (cx.getArg('help')) {
        cx.stdout.write([
          'usage: ls [<path>]',
          'List a file or the contents of a directory.',
          '',
          'If <path> is not provided it defaults to the current directory.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      /** @type {Array<string>} */
      var pathList = cx.getArg('_', [cx.getPwd()]);

      var listNext = function() {
        if (!pathList.length) {
          cx.closeOk();
          return;
        }

        var pathSpec = pathList.shift();
        listPathSpec(cx, pathSpec).then(listNext);
      };

      listNext();
    };

    __es6_export__("main", main);

    /**
     * @param {JsExecuteContext} cx
     * @param {string} pathSpec
     * @return {!Promise<*>}
     */
    var listPathSpec = function(cx, pathSpec) {
      /** @type {string} */
      var pwd = cx.getPwd();
      /** @type {Path} */
      var path = Path.abs(pwd, pathSpec);

      var fileSystem = cx.fileSystemManager;
      return fileSystem.list(path).then(
        function(listResult) {
          var names = Object.keys(listResult).sort();
          var rv = 'Listing of ' + JSON.stringify(path.spec) + ', ';
          if (names.length === 0) {
            rv += 'empty.';
          } else if (names.length == 1) {
            rv += '1 entry:';
          } else {
            rv += names.length + ' entries:';
          }

          rv += '\n';

          if (names.length > 0) {
            var longest = names[0].length;
            names.forEach(function(name) {
              if (name.length > longest) longest = name.length;
            });

            names.forEach(function(name) {
              var stat = listResult[name];
              rv += name;
              rv += (stat.mode & Path.Mode.D) ? '/' : ' ';
              for (var i = 0; i < longest - name.length; i++) {
                rv += ' ';
              }

              rv += '   ' + formatStat(stat) + '\n';
            });
          }

          cx.stdout.write(rv);
          return Promise.resolve();
        }
      ).catch(
       function(value) {
         if (AxiomError.TypeMismatch.test(value)) {
           return fileSystem.stat(path).then(
             function(stat) {
               cx.stdout.write(path.getBaseName() + '  ' + formatStat(stat) + '\n');
               return Promise.resolve();
             }
           ).catch(
             function(value) {
               return cx.closeError(value);
             }
           );
         } else {
           return cx.closeError(value);
         }
       });
    };

    main.signature = {
      'help|h': '?',
      '_': '@'
    };

    __es6_export__("default", main);
  }
);

//# sourceMappingURL=ls.js.map
define(
  "wash/exe/mkdir",
  ["axiom/core/error", "axiom/fs/path", "exports"],
  function(axiom$core$error$$, axiom$fs$path$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      if (list.length === 0 || cx.getArg('help')) {
        cx.stdout.write([
          'usage: mkdir <path> ...',
          'Create one or more new directories.',
          '',
          'All parent directories must already exist.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      var fileSystem = cx.fileSystemManager;
      var errors = false;

      var mkdirNext = function() {
        if (!list.length) {
          return;
        }

        /** @type {string} */
        var pathSpec = list.shift();
        /** @type {Path} */
        var path = Path.abs(cx.getPwd(), pathSpec);

        return fileSystem.mkdir(path)
          .then(function() {
            return mkdirNext();
          })
          .catch(function(e) {
            errors = true;
            cx.stdout.write(
                'mkdir: ' + path.originalSpec + ': ' + e.toString() + '\n');
            return mkdirNext();
          });
      };

      mkdirNext().then(function() {
        if (errors) {
          cx.closeError(
              new AxiomError.Runtime('Some directories could not be created'));
        } else {
          cx.closeOk();
        }
      });
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'help|h': '?',
      '_': '@'
    };
  }
);

//# sourceMappingURL=mkdir.js.map
define(
  "wash/exe/mkstream",
  ["axiom/core/error", "axiom/fs/data_type", "axiom/fs/path", "exports"],
  function(axiom$core$error$$, axiom$fs$data_type$$, axiom$fs$path$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef FileSystem$$module$axiom$fs$base$file_system */
    var FileSystem;

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      if ((list.length !== 1 || !cx.getArg('src') || !cx.getArg('type')) ||
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

      /** @type {FileSystem} */
      var fileSystem = cx.fileSystemManager;
      /** @type {string} */
      var pwd = cx.getPwd();
      /** @type {Path} */
      var path = Path.abs(pwd, list[0]);
      createStream_(fileSystem, path, cx.getArg('type'), cx.getArg('src')).then(
        function() {
          cx.closeOk();
        }
      ).catch(
        function(error) {
          cx.closeError(error);
        }
      );
    };

    __es6_export__("main", main);

    /**
     * @param {FileSystem} fileSystem
     * @param {Path} path
     * @param {String} type
     * @param {String} src
     * @return {Promise}
     */
    var createStream_ = function(fileSystem, path, type, src) {
      return fileSystem.stat(path).then(
        function() {
          return Promise.reject(new AxiomError.Duplicate('stream', path.spec))
        }
      ).catch(
        function(error) {
          if (error instanceof AxiomError.NotFound) {
            return Promise.resolve();
          }
          return Promise.reject(error);
        }
      ).then(function() {
          var stream = {
            type: type,
            src: src
          };
          return fileSystem.writeFile(
              path, DataType.UTF8String, JSON.stringify(stream));
        }
      );
    };

    __es6_export__("default", main);

    main.signature = {
      'help|h': '?',
      'src|s': '$',
      'type|t': '$',
      '_': '@'
    };
  }
);

//# sourceMappingURL=mkstream.js.map
define(
  "wash/exe/mount.gdrive",
  ["axiom/core/error", "axiom/fs/gdrive/file_system", "exports"],
  function(axiom$core$error$$, axiom$fs$gdrive$file_system$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var GDriveFileSystem;
    GDriveFileSystem = axiom$fs$gdrive$file_system$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    var main = function(cx) {
      if (document.location.protocol !== 'https:') {
        cx.closeError(new AxiomError.Incompatible(
            'connection protocol',
            'gdrive file system requires HTTPS connection, not ' +
                document.location.protocol));
        return;
      }

      cx.ready();

      if (cx.getArg('help')) {
        cx.stdout.write([
          'usage: mount.gdrive [-n|--name <name>]',
          'Mount a Google Drive file system.',
          '',
          'If -n is provided, it\'ll be used as the name of the new file system.',
          '',
          'This command will pop up a new window for authentication purposes.  ',
          'You may have to disable your popup blocker to see it.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      /** @type {!FileSystemManager} */
      var fsm = cx.fileSystemManager;
      GDriveFileSystem.mount(fsm, cx.getArg('name', 'gdrive'))
        .then(function() {
          cx.closeOk();
        })
        .catch(function(error) {
          cx.closeError(error);
        });
    };

    __es6_export__("main", main);

    main.signature = {
      'help|h': '?',
      'name|n': '$'
    };

    __es6_export__("default", main);
  }
);

//# sourceMappingURL=mount.gdrive.js.map
define(
  "wash/exe/mount",
  ["axiom/core/error", "axiom/fs/path", "wash/string_utils", "exports"],
  function(axiom$core$error$$, axiom$fs$path$$, wash$string_utils$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var getWhitespace;
    getWhitespace = wash$string_utils$$["getWhitespace"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    var main = function(cx) {
      cx.ready();

      if (cx.getArg('help') || cx.getArg('_')) {
        cx.stdout.write([
          'usage: mount [-t|--type <type>] [-n|--name <name>]',
          'List mounted filesystems, or mount a new file system.',
          '',
          'If called with no arguments this command will list the current mounts.',
          'If the -t argument is provided, this will defer to a mount.<type>',
          'executable to mount a new file system.',
          '',
          'If -n is provided, it\'s passed to the mount command.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      if (cx.getArg('t')) {
        mountFileSystem_(cx);
      } else {
        listFileSystems_(cx);
      }
    };

    __es6_export__("main", main);

    /**
     * @param {JsExecuteContext} cx
     * @return {void}
     */
    var listFileSystems_ = function(cx) {
      /** @type {FileSystemManager} */
      var fsm = cx.fileSystemManager;
      var fileSystems = fsm.getFileSystems();

      var rv = 'Mounted file systems:\n';
      var maxLength = 0;
      fileSystems.forEach(function(fileSystem) {
        if (fileSystem.rootPath.spec.length >= maxLength)
          maxLength = fileSystem.rootPath.spec.length;
      });

      fileSystems.forEach(function(fileSystem) {
        var spaces = getWhitespace(maxLength - fileSystem.rootPath.spec.length + 3);
        rv += fileSystem.rootPath.spec + spaces + '"' +
            fileSystem.description + '"' + '\n';
      });

      cx.stdout.write(rv);
      cx.closeOk(null);
    };

    /**
     * @param {JsExecuteContext} cx
     * @return {void}
     */
    var mountFileSystem_ = function(cx) {
      /** @type {string} */
      var fsType = cx.getArg('t');
      var fsMountCmd = new Path('jsfs:/exe/mount.' + fsType);

      var arg = {};
      var name = cx.getArg('name', null);
      if (name)
        arg['name'] = name;

      cx.call(fsMountCmd, arg).then(function() {
        cx.closeOk();
      }).catch(function(err) {
        cx.closeError(err);
      });
    };

    main.signature = {
      'help|h': '?',
      'type|t': '$',
      'name|n': '$',
      '_': '@'
    };

    __es6_export__("default", main);
  }
);

//# sourceMappingURL=mount.js.map
define(
  "wash/exe/mount.stream",
  ["axiom/core/error", "axiom/fs/stream/stub_file_system", "axiom/fs/data_type", "axiom/fs/path", "axiom/fs/stream/channel", "axiom/fs/stream/transport", "axiom/fs/stream/web_socket_streams", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$stream$stub_file_system$$,
    axiom$fs$data_type$$,
    axiom$fs$path$$,
    axiom$fs$stream$channel$$,
    axiom$fs$stream$transport$$,
    axiom$fs$stream$web_socket_streams$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var StubFileSystem;
    StubFileSystem = axiom$fs$stream$stub_file_system$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var Channel;
    Channel = axiom$fs$stream$channel$$["default"];
    var Transport;
    Transport = axiom$fs$stream$transport$$["default"];
    var WebSocketStreams;
    WebSocketStreams = axiom$fs$stream$web_socket_streams$$["default"];

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
    var ReadableStream;

    /** @typedef ReadResult$$module$axiom$fs$read_result */
    var ReadResult;

    /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
    var WritableStream;

    var main = function(cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      if (list.length !== 1 || cx.getArg('help')) {
        cx.stdout.write([
          'usage: mount.stream [-n|--name <name>] <path-to-stream>',
          'Mount a Stream file system.',
          '',
          'If -n is provided, it\'ll be used as the name of the new file system.',
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      /** @type {!FileSystemManager} */
      var fsm = cx.fileSystemManager;
      /** @type {!string} */
      var name = cx.getArg('name', 'streamfs');
      /** @type {string} */
      var pwd = cx.getPwd();
      /** @type {!Path} */
      var path = Path.abs(pwd, list[0]);

      mountStream_(cx, fsm, name, path).then(
        function() {
          cx.closeOk();
        }
      ).catch(
        function(error) {
          cx.closeError(error);
        }
      )
    };

    __es6_export__("main", main);

    main.signature = {
      'help|h': '?',
      'name|n': '$',
      '_': '@'
    };

    __es6_export__("default", main);

    /**
     * @param {!JsExecuteContext} cx
     * @param {!FileSystemManager} fileSystemManager
     * @param {!string} name
     * @param {!Path} path
     * @return {!Promise}
     */
    var mountStream_ = function(cx, fileSystemManager, name, path) {
      return fileSystemManager.readFile(path, DataType.UTF8String).then(
        function(/** ReadResult */ result) {
          if (typeof result.data != 'string') {
            return Promise.reject(new AxiomError.TypeMismatch(
                'string', typeof result.data));
          }
          var data = JSON.parse(result.data);
          if (!(data instanceof Object)) {
            return Promise.reject(new AxiomError.TypeMismatch(
                'object', typeof data));
          }

          var streamType = data['type'];
          if (typeof streamType !== 'string') {
            return Promise.reject(new AxiomError.TypeMismatch(
                'string', typeof streamType));
          }

          var streamSrc = data['src'];
          if (typeof streamSrc !== 'string') {
            return Promise.reject(new AxiomError.TypeMismatch(
                'string', typeof streamSrc));
          }

          cx.stdio.stdout.write('Connecting to "' + streamSrc + '"...');
          return createStreams_(cx, streamType, streamSrc).then(
            function(streams) {
              cx.stdio.stdout.write('ok\n');
              var transport = new Transport(
                  'websocket',
                  streams.readableStream,
                  streams.writableStream);
              var channel = new Channel('websocketchannel', 'ws', transport);
              var fileSystem =
                  new StubFileSystem(fileSystemManager, name, channel);
              fileSystem.description =
                  'streamfs - ' + streamType + ' - ' + streamSrc;

              fileSystem.onClose.addListener(function() {
                streams.close();
              });
              streams.resume();

              // Connect file system to remote end to make sure we have a valid
              // and supported Channel.
              return fileSystem.connect().then(
                function() {
                  fileSystemManager.mount(fileSystem);
                }
              ).then(
                function() {
                  cx.stdout.write('Mounted file system "' +
                      fileSystem.name + ':" from "' + streamSrc + '"\n');
                },
                function(error) {
                  fileSystem.closeError(error);
                  return Promise.reject(error);
                }
              );
            },
            function(error) {
              cx.stdio.stdout.write('error\n');
              return Promise.reject(error);
            }
          );
        }
      )
    };

    /**
      * @typedef {{
      *  readableStream: !ReadableStream,
      *  writableStream: !WritableStream,
      *  close: !function():void,
      *  resume: !function():void
      * }}
      */
    var CreateStreamsResult;

    /**
     * @param {!JsExecuteContext} cx
     * @param {!string} streamType
     * @param {!string} streamSrc
     * @return {!Promise<!CreateStreamsResult>}
     */
    var createStreams_ = function(cx, streamType, streamSrc) {
      if (streamType === 'websocket') {
        var streams = new WebSocketStreams();
        return streams.open(streamSrc).then(
          function() {
            /** @type {!CreateStreamsResult} */
            var result = {
              readableStream: streams.readableStream,
              writableStream: streams.writableStream,
              close: function() { streams.close(); },
              resume: function() { streams.resume(); }
            };
            return Promise.resolve(result);
          }
        );
      }

      // TODO(rpaquay): Add support for more stream types.
      return Promise.reject(
          new AxiomError.Invalid('stream-type', streamType));
    };
  }
);

//# sourceMappingURL=mount.stream.js.map
define(
  "wash/exe/mv",
  ["axiom/core/error", "axiom/fs/path", "exports"],
  function(axiom$core$error$$, axiom$fs$path$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      if (list.length != 2 || cx.getArg('help')) {
        cx.stdout.write([
          'usage: mv <source> <destination>',
          'Move a file to a new location.',
          '',
          'If both locations are on the same file system this will perform an',
          'atomic move.  If not, it\'ll perform a copy and delete (see `cp -h` ',
          'for the details on how copying works).'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      /** @type {string} */
      var fromPathSpec = list[0];
      /** @type {string} */
      var toPathSpec = list[1];
      /** @type {string} */
      var pwd = cx.getPwd();

      /** @type {Path} */
      var fromPath = Path.abs(pwd, fromPathSpec);
      /** @type {Path} */
      var toPath = Path.abs(pwd, toPathSpec);

      cx.fileSystemManager.move(fromPath, toPath)
        .then(function() {
          cx.closeOk();
        }).catch(function(err) {
          cx.closeError(err);
        });
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'help|h': '?',
      '_': '@'
    };
  }
);

//# sourceMappingURL=mv.js.map
define("wash/exe/pwd", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  // Copyright (c) 2015 Google Inc. All rights reserved.
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

  /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
  var JsExecuteContext;

  var main = function(cx) {
    cx.ready();

    if (cx.getArg('help')) {
      cx.stdout.write([
        'usage: pwd',
        'Return the present working directory.',
        '',
        'If the environment variable `$PWD` is not set, a reasonable default',
        'directory will be returned.'
      ].join('\r\n') + '\r\n');
      cx.closeOk();
      return;
    }

    /** @type {string} */
    var pwd = cx.getEnv('$PWD',
        cx.fileSystemManager.defaultFileSystem.rootPath.spec);
    cx.closeOk(pwd);
  };

  __es6_export__("main", main);
  __es6_export__("default", main);

  main.signature = {
    'help|h': '?'
  };
});

//# sourceMappingURL=pwd.js.map
define(
  "wash/exe/readline",
  ["axiom/core/error", "axiom/core/completer", "axiom/core/ephemeral", "wash/termcap", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$completer$$,
    axiom$core$ephemeral$$,
    wash$termcap$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Completer;
    Completer = axiom$core$completer$$["default"];
    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];
    var Termcap;
    Termcap = wash$termcap$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    /**
     * @constructor
     * A partial clone of GNU readline.
     *
     * @param {JsExecuteContext} executeContext
     */
    var Readline = function(executeContext) {
      this.executeContext = executeContext;

      this.promptString_ = executeContext.getArg('prompt-string', '');
      this.promptVars_ = null;

      this.history_ = [];
      this.historyIndex_ = 0;

      this.line = '';
      this.linePosition = 0;

      this.debug_ = false;

      // Set to true when done reading stdin, i.e. a line has been fully accepted or
      // aborted.
      this.done_ = false;

      // Used to notify caller that a line has been read.
      this.completer_ = new Completer();

      // Cursor position when the read() started.
      this.cursorHome_ = null;

      // Cursor position after printing the prompt.
      this.cursorPrompt_ = null;

      this.verbose = false;

      this.nextUndoIndex_ = 0;
      this.undo_ = [['', 0]];

      // Global killRing shared across all readline instances.  WCGW?
      this.killRing_ = Readline.killRing;

      this.previousLineHeight_ = 0;

      this.pendingESC_ = false;

      this.tc_ = new Termcap();

      this.bindings = {};
      this.addKeyBindings(Readline.defaultBindings);
    };

    __es6_export__("Readline", Readline);
    var main = function(cx) {
      if (!cx.getTTY().isatty) {
        cx.closeError(new AxiomError.Runtime('Not a tty'));
        return;
      }

      var readline = new Readline(cx);
      cx.ready();

      if (cx.getArg('help')) {
        cx.stdout.write([
          'usage: readline [-i <array>] [-p <string>]',
          'Read a line of input from the terminal and return it to the caller.',
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }


      var inputHistory = cx.getArg('input-history', []);
      readline.read(inputHistory).then(
        function(value) {
          cx.closeOk(value);
        },
        function(err) {
          cx.closeError(err);
        });
    };

    __es6_export__("main", main);

    main.signature = {
      'help|h': '?',
      'input-history|i': '@',
      'prompt-string|p': '$'
    };

    __es6_export__("default", main);

    Readline.killRing = [];

    /**
     * Default mapping of key sequence to readline commands.
     *
     * Uses Termcap syntax for the keys.
     * @dict
     */
    Readline.defaultBindings = {
      '%(BACKSPACE)': 'backward-delete-char',
      '%(ENTER)': 'accept-line',

      '%(LEFT)': 'backward-char',
      '%(RIGHT)': 'forward-char',

      '%(UP)': 'previous-history',
      '%(DOWN)': 'next-history',

      '%(HOME)': 'beginning-of-line',
      '%(END)': 'end-of-line',
      '%(DELETE)': 'delete-char',

      '%ctrl("A")': 'beginning-of-line',
      '%ctrl("D")': 'delete-char-or-eof',
      '%ctrl("E")': 'end-of-line',
      '%ctrl("H")': 'backward-delete-char',
      '%ctrl("K")': 'kill-line',
      '%ctrl("L")': 'clear-home',
      '%ctrl("N")': 'next-history',
      '%ctrl("P")': 'previous-history',
      '%ctrl("Y")': 'yank',
      '%ctrl("_")': 'undo',
      '%ctrl("/")': 'undo',

      '%ctrl(LEFT)': 'backward-word',
      '%ctrl(RIGHT)': 'forward-word',

      // Meta and key at the same time.
      '%meta(BACKSPACE)': 'backward-kill-word',
      '%meta(DELETE)': 'kill-word',
      '%meta(">")': 'end-of-history',
      '%meta("<")': 'beginning-of-history',

      // Meta, then key.
      //
      // TODO(rginda): This would be better as a nested binding, like...
      //   '%(META)': { '%(DELETE)': 'kill-word', ... }
      // ...which would also allow provide for C-c and M-x multi key sequences.
      '%(META)%(DELETE)': 'kill-word',
      '%(META).': 'yank-last-arg',
    };

    /**
     * Read a line of input.
     *
     * Prints the given prompt, and waits while the user edits a line of text.
     * Provides editing functionality through the keys specified in defaultBindings.
     *
     * @param {Array<*>} inputHistory
     * @return {!Promise<string>} Line read from stdin, or null if operation
     *    has been aborted.
     */
    Readline.prototype.read = function(inputHistory) {
      this.history_ = [''];
      if (inputHistory) {
        // Ensure the history is nothing but strings.
        inputHistory = inputHistory.filter(function(el) {
          return typeof el == 'string';
        });
        this.history_ = this.history_.concat(inputHistory);
      }

      this.line = this.history_[0] = '';
      this.linePosition = 0;

      this.nextUndoIndex_ = 0;
      this.undo_ = [['', 0]];

      this.cursorHome_ = null;
      this.cursorPrompt_ = null;

      this.previousLineHeight_ = 0;

      // Hook up reading from stdin.
      this.executeContext.stdin.pause();
      this.executeContext.stdin.onReadable.addListener(this.readStdIn_, this);

      // Print a request.
      this.print('%get-row-column()');
      // Read back and handle a response.
      this.readStdIn_();

      this.done_ = false;
      return this.completer_.promise;
    };

    /**
     * Find the start of the word under linePosition in the given line.
     * @param {string} line
     * @param {number} linePosition
     * @return {number}
     */
    Readline.getWordStart = function(line, linePosition) {
      var left = line.substr(0, linePosition);

      var searchEnd = left.search(/[a-z0-9][^a-z0-9]*$/i);
      left = left.substr(0, searchEnd);

      var wordStart = left.search(/[^a-z0-9][a-z0-9]*$/i);
      return (wordStart > 0) ? wordStart + 1 : 0;
    };

    /**
     * Find the end of the word under linePosition in the given line.
     * @param {string} line
     * @param {number} linePosition
     * @return {number}
     */
    Readline.getWordEnd = function(line, linePosition) {
      var right = line.substr(linePosition);

      var searchStart = right.search(/[a-z0-9]/i);
      right = right.substr(searchStart);

      var wordEnd = right.search(/[^a-z0-9]/i);

      if (wordEnd == -1)
        return line.length;

      return linePosition + searchStart + wordEnd;
    };

    /**
     * Register multiple key bindings.
     *
     * @param {Object} obj
     * @return {void}
     */
    Readline.prototype.addKeyBindings = function(obj) {
      for (var key in obj) {
        this.addKeyBinding(key, obj[key]);
      }
    };

    /**
     * Register a single key binding.
     *
     * @param {string} str
     * @param {string} commandName
     * @return {void}
     */
    Readline.prototype.addKeyBinding = function(str, commandName) {
      this.addRawKeyBinding(this.tc_.input(str), commandName);
    };

    /**
     * Register a binding without passing through termcap.
     *
     * @param {string} str
     * @param {string} commandName
     * @return {void}
     */
    Readline.prototype.addRawKeyBinding = function(bytes, commandName) {
      this.bindings[bytes] = commandName;
    };

    /**
     * @param {!string} str
     * @param {Object=} opt_vars
     */
    Readline.prototype.print = function(str, opt_vars) {
      this.executeContext.stdout.write(this.tc_.output(str, opt_vars || {}));
    };

    /**
     * @param {!string} str
     * @param {!Object} vars
     */
    Readline.prototype.setPrompt = function(str, vars) {
      this.promptString_ = str;
      this.promptVars_ = vars;

      this.cursorPrompt_ = null;

      if (this.executeContext.isEphemeral('Ready'))
        this.dispatch('redraw-line');
    };

    /**
     * @param {string} name
     * @param {*=} arg
     */
    Readline.prototype.dispatch = function(name, arg) {
      this.commands[name].call(this, arg);
    };

    /**
     * Instance method version of getWordStart.
     *
     * @return {number}
     */
    Readline.prototype.getWordStart = function() {
      return Readline.getWordStart(this.line, this.linePosition);
    };

    /**
     * Instance method version of getWordEnd.
     *
     * @return {number}
     */
    Readline.prototype.getWordEnd = function() {
      return Readline.getWordEnd(this.line, this.linePosition);
    };

    /**
     * @param {number} start
     * @param {number} length
     * @return {void}
     */
    Readline.prototype.killSlice = function(start, length) {
      if (length == -1)
        length = this.line.length - start;

      var killed = this.line.substr(start, length);
      this.killRing_.unshift(killed);

      this.line = (this.line.substr(0, start) + this.line.substr(start + length));
    };

    // TODO(rginda): Readline.on does not exist.
    // Readline.prototype.dispatchMessage = function(msg) {
    //   msg.dispatch(this, Readline.on);
    // };

    /**
     * Called when the terminal replys with the current cursor position.
     * @param {number} row
     * @param {number} column
     * @return {void}
     */
    Readline.prototype.onCursorReport = function(row, column) {
      if (!this.cursorHome_) {
        this.cursorHome_ = {row: row, column: column};
        this.dispatch('redraw-line');
        return;
      }

      if (!this.cursorPrompt_) {
        this.cursorPrompt_ = {row: row, column: column};
        if (this.cursorHome_.row == this.cursorPrompt_.row) {
          this.promptLength_ =
              this.cursorPrompt_.column - this.cursorHome_.column;
        } else {
          var tty = this.executeContext.getTTY();

          var top = tty.columns - this.cursorPrompt_.column;
          var bottom = this.cursorHome_.column;
          var middle = tty.columns * (this.cursorPrompt_.row -
                                       this.cursorHome_.row);
          this.promptLength_ = top + middle + bottom;
        }

        this.dispatch('redraw-line');
        return;
      }

      console.warn('Unexpected cursor position report: ' + row + ', ' + column);
      return;
    };

    /**
     * Process all pending values from stdin, until the line is accepted/aborted
     * or stdin is empty.
     *
     * @private
     * @return {void}
     */
    Readline.prototype.readStdIn_ = function() {
      while (true) {
        if (this.done_)
          break;

        var value = this.executeContext.stdin.read();
        if (!value)
          break;

        this.processInput_(value);
      }
    };

    /**
     * Process a single input string value.
     *
     * @private
     * @param {*} value
     * @return {void}
     */
    Readline.prototype.processInput_ = function(value) {
      if (typeof value != 'string')
        return;

      var string = value;

      var ary = string.match(/^\x1b\[(\d+);(\d+)R$/);
      if (ary) {
        this.onCursorReport(parseInt(ary[1], 10), parseInt(ary[2], 10));
        return;
      }

      if (string == '\x1b') {
        this.pendingESC_ = true;
        return;
      }

      if (this.pendingESC_) {
        string = '\x1b' + string;
        this.pendingESC_ = false;
      }

      var commandName = this.bindings[string];

      if (commandName) {
        if (this.verbose)
          console.log('dispatch: ' + JSON.stringify(string) + ' => ' + commandName);

        if (!(commandName in this.commands)) {
          throw new Error('Unknown command "' + commandName + '", bound to: ' +
                          string);
        }

        var previousLine = this.line;
        var previousPosition = this.linePosition;

        if (commandName != 'undo')
          this.nextUndoIndex_ = 0;

        this.dispatch(commandName, string);

        if (previousLine != this.line && previousLine != this.undo_[0][0])
          this.undo_.unshift([previousLine, previousPosition]);

      } else if (/^[\x20-\xff]+$/.test(string)) {
        this.nextUndoIndex_ = 0;
        this.commands['self-insert'].call(this, string);
      } else if (this.debug_) {
        console.log('unhandled: ' + JSON.stringify(string));
      }
    };

    Readline.prototype.commands = {};

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['clear-home'] = function(string) {
      this.print('%clear-terminal()%set-row-column(row, column)',
                 {row: 0, column: 0});
      this.cursorHome_ = null;
      this.cursorPrompt_ = null;
      this.print('%get-row-column()');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['redraw-line'] = function(string) {
      if (!this.cursorHome_) {
        console.warn('readline: Home cursor position unknown, won\'t redraw.');
        return;
      }

      if (!this.cursorPrompt_) {
        // We don't know where the cursor ends up after printing the prompt.
        // We can't just depend on the string length of the prompt because
        // it may have non-printing escapes.  Instead we echo the prompt and then
        // locate the cursor.
        this.print('%set-row-column(row, column)',
                   { row: this.cursorHome_.row,
                     column: this.cursorHome_.column,
                   });
        this.print(this.promptString_, this.promptVars_);
        this.print('%get-row-column()');
        return;
      }

      this.print('%set-row-column(row, column)%(line)',
                 { row: this.cursorPrompt_.row,
                   column: this.cursorPrompt_.column,
                   line: this.line
                 });

      var tty = this.executeContext.getTTY();

      var totalLineLength = this.cursorHome_.column - 1 + this.promptLength_ +
          this.line.length;
      var totalLineHeight = Math.ceil(totalLineLength / tty.columns);
      var additionalLineHeight = totalLineHeight - 1;

      var lastRowFilled = (totalLineLength % tty.columns) === 0;
      if (!lastRowFilled)
        this.print('%erase-right()');

      if (totalLineHeight < this.previousLineHeight_) {
        for (var i = totalLineHeight; i < this.previousLineHeight_; i++) {
          this.print('%set-row-column(row, 1)%erase-right()',
                     {row: this.cursorPrompt_.row + i});
        }
      }

      this.previousLineHeight_ = totalLineHeight;

      if (totalLineLength >= tty.columns) {
        // This line overflowed the terminal width.  We need to see if it also
        // overflowed the height causing a scroll that would invalidate our idea
        // of the cursor home row.
        var scrollCount;

        if (this.cursorHome_.row + additionalLineHeight == tty.rows &&
            lastRowFilled) {
          // The line was exactly long enough to fill the terminal width and
          // and height.  Insert a newline to hold the new cursor position.
          this.print('\n');
          scrollCount = 1;
        } else {
          scrollCount = this.cursorHome_.row + additionalLineHeight - tty.rows;
        }

        if (scrollCount > 0) {
          this.cursorPrompt_.row -= scrollCount;
          this.cursorHome_.row -= scrollCount;
        }
      }

      this.dispatch('reposition-cursor');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['abort-line'] = function() {
      this.done_ = true;
      this.completer_.resolve(null);
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['reposition-cursor'] = function(string) {
      // Count the number or rows it took to render the current line at the
      // current terminal width.
      var tty = this.executeContext.getTTY();
      var rowOffset = Math.floor((this.cursorPrompt_.column - 1 +
                                  this.linePosition) / tty.columns);
      var column = (this.cursorPrompt_.column + this.linePosition -
                    (rowOffset * tty.columns));
      this.print('%set-row-column(row, column)',
                 { row: this.cursorPrompt_.row + rowOffset,
                   column: column
                 });
    };

    /**
     * @this {Readline}
     */
    Readline.prototype.commands['self-insert'] = function(string) {
      if (this.linePosition == this.line.length) {
        this.line += string;
      } else {
        this.line = this.line.substr(0, this.linePosition) + string +
            this.line.substr(this.linePosition);
      }

      this.linePosition += string.length;

      this.history_[0] = this.line;

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['accept-line'] = function() {
      this.historyIndex_ = 0;
      if (this.line && this.line != this.history_[1])
        this.history_.splice(1, 0, this.line);
      this.print('\r\n');
      this.done_ = true;
      this.completer_.resolve(this.line);
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['beginning-of-history'] = function() {
      this.historyIndex_ = this.history_.length - 1;
      this.line = this.history_[this.historyIndex_];
      this.linePosition = this.line.length;

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['end-of-history'] = function() {
      this.historyIndex_ = this.history_.length - 1;
      this.line = this.history_[this.historyIndex_];
      this.linePosition = this.line.length;

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['previous-history'] = function() {
      if (this.historyIndex_ == this.history_.length - 1) {
        this.print('%bell()');
        return;
      }

      this.historyIndex_ += 1;
      this.line = this.history_[this.historyIndex_];
      this.linePosition = this.line.length;

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['next-history'] = function() {
      if (this.historyIndex_ === 0) {
        this.print('%bell()');
        return;
      }

      this.historyIndex_ -= 1;
      this.line = this.history_[this.historyIndex_];
      this.linePosition = this.line.length;

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['kill-word'] = function() {
      var start = this.linePosition;
      var length =  this.getWordEnd() - start;
      this.killSlice(start, length);

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['backward-kill-word'] = function() {
      var start = this.getWordStart();
      var length = this.linePosition - start;
      this.killSlice(start, length);
      this.linePosition = start;

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['kill-line'] = function() {
      this.killSlice(this.linePosition, -1);

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['yank'] = function() {
      var text = this.killRing_[0];
      this.line = (this.line.substr(0, this.linePosition) +
                   text +
                   this.line.substr(this.linePosition));
      this.linePosition += text.length;

      this.dispatch('redraw-line');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['yank-last-arg'] = function() {
      if (this.history_.length < 2)
        return;

      var last = this.history_[1];
      var i = Readline.getWordStart(last, last.length - 1);
      if (i != -1)
        this.dispatch('self-insert', last.substr(i));
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['delete-char-or-eof'] = function() {
      if (!this.line.length) {
        this.dispatch('abort-line');
      } else {
        this.dispatch('delete-char');
      }
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['delete-char'] = function() {
      if (this.linePosition < this.line.length) {
        this.line = (this.line.substr(0, this.linePosition) +
                     this.line.substr(this.linePosition + 1));
        this.dispatch('redraw-line');
      } else {
        this.print('%bell()');
      }
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['backward-delete-char'] = function() {
      if (this.linePosition > 0) {
        this.linePosition -= 1;
        this.line = (this.line.substr(0, this.linePosition) +
                     this.line.substr(this.linePosition + 1));
        this.dispatch('redraw-line');
      } else {
        this.print('%bell()');
      }
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['backward-char'] = function() {
      if (this.linePosition > 0) {
        this.linePosition -= 1;
        this.dispatch('reposition-cursor');
      } else {
        this.print('%bell()');
      }
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['forward-char'] = function() {
      if (this.linePosition < this.line.length) {
        this.linePosition += 1;
        this.dispatch('reposition-cursor');
      } else {
        this.print('%bell()');
      }
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['backward-word'] = function() {
      this.linePosition = this.getWordStart();
      this.dispatch('reposition-cursor');
    };


    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['forward-word'] = function() {
      this.linePosition = this.getWordEnd();
      this.dispatch('reposition-cursor');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['beginning-of-line'] = function() {
      if (this.linePosition === 0) {
        this.print('%bell()');
        return;
      }

      this.linePosition = 0;
      this.dispatch('reposition-cursor');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['end-of-line'] = function() {
      if (this.linePosition == this.line.length) {
        this.print('%bell()');
        return;
      }

      this.linePosition = this.line.length;
      this.dispatch('reposition-cursor');
    };

    /**
     * @this {Readline}
     * @return {void}
     */
    Readline.prototype.commands['undo'] = function() {
      if ((this.nextUndoIndex_ == this.undo_.length)) {
        this.print('%bell()');
        return;
      }

      this.line = this.undo_[this.nextUndoIndex_][0];
      this.linePosition = this.undo_[this.nextUndoIndex_][1];

      this.dispatch('redraw-line');

      this.nextUndoIndex_ += 2;
    };
  }
);

//# sourceMappingURL=readline.js.map
define(
  "wash/exe/rm",
  ["axiom/core/error", "axiom/fs/path", "exports"],
  function(axiom$core$error$$, axiom$fs$path$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      if (list.length === 0  || cx.getArg('help')) {
        cx.stdout.write([
          'usage: rm <path> ...',
          'Remove one or more paths.',
          '',
          'This will remove files and directories without a second thought.  Be',
          'careful.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      var fileSystem = cx.fileSystemManager;
      var errors = false;

      var rmNext = function() {
        if (!list.length) {
          return null;
        }

        /** @type {string} */
        var pathSpec = list.shift();
        /** @type {Path} */
        var path = Path.abs(cx.getPwd(), pathSpec);

        return fileSystem.unlink(path)
          .then(function() {
            return rmNext();
          })
          .catch(function(e) {
            errors = true;
            cx.stdout.write('rm: ' + path.originalSpec + ': ' + e.toString() +
                '\n');
            return rmNext();
          });
      };

      rmNext().then(function() {
        if (errors) {
          cx.closeError(new AxiomError.Runtime('Some files could not be removed'));
        } else {
          cx.closeOk();
        }
      });
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'help|h': '?',
      '_': '@'
    };
  }
);

//# sourceMappingURL=rm.js.map
define(
  "wash/exe/sort",
  ["axiom/core/ephemeral", "exports"],
  function(axiom$core$ephemeral$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();
      // We might need to read from stdin: pause it so no data is lost.
      cx.stdin.pause();

      if (cx.getArg('help', false) || cx.getArg('_')) {
        cx.stdout.write([
          'Usage: sort',
          'Example: cat foo.txt | sort > sorted_foo.txt',
          '',
          'Options:',
          '',
          '  -h, --help',
          '      Print this help message and exit.',
          '  -f, --ignore-case',
          '      Fold lower case to upper case characters.',
          '  -n, --numeric-sort',
          '      Compare according to string numerical value.',
          '  -r, --reverse',
          '      Reverse the result of comparisons.',
          '  -z, --zero-terminated',
          '      End lines with 0 byte, not newline.',
          '',
          'A filter that reads the lines from stdin until it closes, sorts them,',
          'and prints the result to stdout.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      var ignoreCase = cx.getArg('ignore-case', false);
      var reverse = cx.getArg('reverse', false);
      var zeroTerminate = cx.getArg('zero-terminated', false);
      var eol = zeroTerminate ? '\x00' : '\n';
      var eof = zeroTerminate ? '' : '\n';
      var compareOptions = {
        sensitivity: ignoreCase ? 'accent' : 'case',
        numeric: cx.getArg('numeric-sort', false),
        caseFirst: ignoreCase ? 'false' : 'upper'
      };

      var compare = function(a, b) {
        var cmp = a.localeCompare(b, [], compareOptions);
        return reverse ? -cmp : cmp;
      };

      var input = '';

      cx.stdin.onData.addListener(function(data) {
        input += data;
      });

      cx.stdin.onEnd.listenOnce(function() {
        cx.stdout.write(input.split('\n').sort(compare).join(eol) + eof);
        cx.closeOk();
      });

      cx.stdin.onClose.listenOnce(function(error) {
        if (!cx.isEphemeral(Ephemeral.State.Closed)) {
          cx.closeError(error);
        }
      });

      // Let the data flow to the handlers.
      cx.stdin.resume();
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      '_': '@',
      'help|h': '?',
      'ignore-case|f': '?',
      'numeric-sort|n': '?',
      'reverse|r': '?',
      'zero-terminated|z': '?'
    };
  }
);

//# sourceMappingURL=sort.js.map
define(
  "wash/exe/tee",
  ["axiom/fs/data_type", "axiom/fs/open_mode", "axiom/fs/path", "axiom/fs/stream/writable_file_stream_buffer", "exports"],
  function(
    axiom$fs$data_type$$,
    axiom$fs$open_mode$$,
    axiom$fs$path$$,
    axiom$fs$stream$writable_file_stream_buffer$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var OpenMode;
    OpenMode = axiom$fs$open_mode$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var WritableFileStreamBuffer;
    WritableFileStreamBuffer = axiom$fs$stream$writable_file_stream_buffer$$["default"];


    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
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
          cx.fileSystemManager, filePath, DataType.UTF8String, fileMode);

      cx.stdin.onData.addListener(function(data) {
        fileBuffer.write(data);
        cx.stdout.write(data);
      });

      cx.stdin.onEnd.listenOnce(function() {
        fileBuffer.flush();
        cx.closeOk();
      });
      
      cx.stdin.resume();
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      '_': '@',
      'help|h': '?',
      'append|a': '?'
    };
  }
);

//# sourceMappingURL=tee.js.map
define(
  "wash/exe/touch",
  ["axiom/core/error", "axiom/fs/path", "axiom/fs/base/open_context", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$path$$,
    axiom$fs$base$open_context$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      if (!list.length || cx.getArg('help')) {
        cx.stdout.write([
          'usage: touch <path> ...',
          'Create one or more empty files.'
        ].join('\r\n') + '\r\n');
        return cx.closeOk();
      }

      var fileSystem = cx.fileSystemManager;
      var errors = false;

      var touchNext = function() {
        if (!list.length) {
          return null;
        }

        /** @type {string} */
        var pathSpec = list.shift();
        /** @type {string} */
        var pwd = cx.getPwd();
        /** @type {Path} */
        var path = Path.abs(pwd, pathSpec);

        return fileSystem.createOpenContext(path, 'c').then(function(cx) {
          return OpenContext.scope(cx, function() {
            return cx.open().then(function() {
              return touchNext();
            });
          });
        }).catch(function(e) {
          errors = true;
          cx.stdout.write('touch: ' + path.originalSpec
              + ': ' + e.toString() + '\n');
          return touchNext();
        });
      };

      touchNext().then(function() {
        if (errors) {
          cx.closeError(new AxiomError.Runtime('Some files could not be touched'));
        } else {
          cx.closeOk();
        }
      });
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'help|h': '?',
      "_": '@'
    };
  }
);

//# sourceMappingURL=touch.js.map
define(
  "wash/exe/wash",
  ["axiom/core/error", "axiom/fs/arguments", "axiom/fs/data_type", "axiom/fs/base/file_system_manager", "axiom/fs/base/open_context", "axiom/fs/path", "axiom/fs/stdio", "axiom/fs/stream/memory_stream_buffer", "axiom/fs/stream/readable_file_stream_buffer", "axiom/fs/stream/writable_file_stream_buffer", "axiom/fs/js/file_system", "axiom/fs/js/entry", "wash/parse", "wash/termcap", "wash/washrc", "wash/version", "wash/wash_util", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$arguments$$,
    axiom$fs$data_type$$,
    axiom$fs$base$file_system_manager$$,
    axiom$fs$base$open_context$$,
    axiom$fs$path$$,
    axiom$fs$stdio$$,
    axiom$fs$stream$memory_stream_buffer$$,
    axiom$fs$stream$readable_file_stream_buffer$$,
    axiom$fs$stream$writable_file_stream_buffer$$,
    axiom$fs$js$file_system$$,
    axiom$fs$js$entry$$,
    wash$parse$$,
    wash$termcap$$,
    wash$washrc$$,
    wash$version$$,
    wash$wash_util$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Arguments;
    Arguments = axiom$fs$arguments$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var FileSystemManager;
    FileSystemManager = axiom$fs$base$file_system_manager$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var Stdio;
    Stdio = axiom$fs$stdio$$["default"];
    var MemoryStreamBuffer;
    MemoryStreamBuffer = axiom$fs$stream$memory_stream_buffer$$["default"];
    var ReadableFileStreamBuffer;
    ReadableFileStreamBuffer = axiom$fs$stream$readable_file_stream_buffer$$["default"];
    var WritableFileStreamBuffer;
    WritableFileStreamBuffer = axiom$fs$stream$writable_file_stream_buffer$$["default"];
    var JsFileSystem;
    JsFileSystem = axiom$fs$js$file_system$$["default"];
    var JsEntry;
    JsEntry = axiom$fs$js$entry$$["default"];
    var Parse;
    Parse = wash$parse$$["default"];
    var Termcap;
    Termcap = wash$termcap$$["default"];
    var Washrc;
    Washrc = wash$washrc$$["default"];
    var version;
    version = wash$version$$["default"];
    var washUtil;
    washUtil = wash$wash_util$$["default"];

    /** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
    var ExecuteContext;

    /** @typedef FileSystem$$module$axiom$fs$base$file_system */
    var FileSystem;

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef ReadResult$$module$axiom$fs$read_result */
    var ReadResult;

    /** @typedef {{name: string, value: *}} */
    var Signal;

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    /** @typedef StreamBuffer$$module$axiom$fs$stream$stream_buffer */
    var StreamBuffer;

    var Wash = function(executeContext) {
      /** @type {JsExecuteContext} */
      this.executeContext = executeContext;

      /** @type {!FileSystemManager} */
      this.fileSystemManager = executeContext.fileSystemManager;

      /** @type {string} */
      this.historyFile = executeContext.getEnv('$HISTFILE', '');

      /** @type {Array<string>} */
      this.inputHistory = [];

      /**
       * @private @type {Array<JsExecuteContext>}
       * The list of currently active jobs.
       */
      this.executeContextList_ = [];

      /**
       * @private @type {Array<JsExecuteContext>}
       */
      this.foregroundContext_ = null;

      /**
       * @private @type {Termcap}
       */
      this.tc_ = new Termcap();

      /**
       * @private @type {string}
       */
      this.promptString_ = '';

      var builtins = {};
      for (var name in Wash.builtins) {
        builtins[name] = [
          Wash.builtins[name][0],
          Wash.builtins[name][1].bind(null, this)
        ];
      }

      this.builtinsFS = new JsFileSystem();
      this.builtinsFS.rootDirectory.install(builtins);

      if (!this.executeContext.getEnv('$PWD')) {
        this.executeContext.setEnv('$PWD', this.executeContext.getPwd());
      }

      if (!this.executeContext.getEnv('$HOME')) {
        this.executeContext.setEnv('$HOME',
            this.fileSystemManager.defaultFileSystem.rootPath.combine('home').spec);
      }

      this.setPrompt();
    };

    __es6_export__("Wash", Wash);

    /**
     * Set to true to make the shell exit if a subcommand errors.
     *
     * This can help debug infinite-loop at startup issues.
     *
     * @type {boolean}
     */
    Wash.exitOnError = false;

    /** @type {Object<string, Array>} */
    Wash.builtins = {
      'cd': [
        { '_': '@' },
        /**
         * @param {Wash} wash
         * @param {JsExecuteContext} cx
         * @return {void}
         */
        function(wash, cx) {
          cx.ready();

          /** @type {Path} */
          var list = cx.getArg('_', []);
          var path = wash.absPath(list[0] || cx.getEnv('$HOME', cx.getPwd()));

          wash.fileSystemManager.stat(path).then(
            function(/** StatResult */ statResult) {
              if (!(statResult.mode & Path.Mode.D)) {
                cx.closeError(
                  new AxiomError.TypeMismatch('dir', path.originalSpec));
                return;
              }

              wash.executeContext.setEnv('$PWD', path.spec);
              cx.closeOk();
            }
          ).catch(function(err) {
            cx.closeError(err);
          });
        }
      ],

      'env-del': [
        { '_': '@' },
        /**
         * @param {Wash} wash
         * @param {JsExecuteContext} cx
         * @return {void}
         */
        function(wash, cx) {
          cx.ready();

          var list = cx.getArg('_', []);
          for (var i = 0; i < list.length; i++) {
            wash.executeContext.delEnv(list[i]);
          }

          cx.closeOk();
        }
      ],

      'env-get': [
        { '_': '@' },
        /**
         * @param {Wash} wash
         * @param {JsExecuteContext} cx
         * @return {void}
         */
        function(wash, cx) {
          cx.ready();

          var list = cx.getArg('_', []);
          if (!list.length) {
            cx.closeOk(wash.executeContext.getEnvs());
            return;
          }

          var rv = {};
          for (var i = 0; i < list.length; i++) {
            rv[list[i]] = wash.executeContext.getEnv(list[i]);
          }

          cx.closeOk(rv);
        }
      ],

      'env-set': [
        { '_': '@' },
        /**
         * @param {Wash} wash
         * @param {JsExecuteContext} cx
         * @return {void}
         */
        function(wash, cx) {
          cx.ready();

          var list = cx.getArg('_');
          for (var i = 0; i < list.length; i++) {
            var map = list[i];
            if (typeof map != 'object') {
              cx.closeError(
                  new AxiomError.TypeMismatch('Object', map));
              return;
            }

            for (var name in map) {
              var value = map[name];
              var sigil = name.substr(0, 1);
              if ('$@%'.indexOf(sigil) == -1) {
                cx.closeError(new AxiomError.Invalid('name', name));
                return;
              }
              if (!Arguments.typeCheck(value, sigil)) {
                cx.closeError(new AxiomError.TypeMismatch(sigil, value));
                return;
              }
              wash.executeContext.setEnv(name, value);
            }
          }

          cx.closeOk();
        }
      ]
    };

    __es6_export__("default", Wash.main = function(cx) {
      var wash = new Wash(cx);

      if (typeof window != 'undefined')
        window.wash_ = wash;  // Console debugging aid.

      cx.ready();

      if (cx.getArg('help')) {
        cx.stdout.write([
          'usage: wash [--no-welcome]',
          'Read-eval-print-loop.',
          '',
          'This command will read a line of text from the user, evaluate it as',
          'a command, print the result, and start over again.',
          '',
          'If the --no-welcome argument is provided, the startup welcome message',
          'will not be printed.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      if (cx.getArg('welcome', true)) {
        cx.stdout.write('Welcome to wash version ' + version + '.\n');
        cx.stdout.write('Type `exit` or Ctrl-D to exit.\n');
      }

      var repl = wash.readEvalPrintLoop.bind(wash);
      wash.loadFile(wash.historyFile).then(function(history) {
        if (history) {
          this.inputHistory = history;
        }
        this.executeWashrc().then(function() {
          repl();
        });
      }.bind(wash)).catch(repl);
      // NOTE: cx will get closed in Wash.prototype.exit()
    });

    Wash.main.signature = {
      'help|h': '?',
      'welcome|w': '?'
    };

    /**
     * Execute the washrc file.
     *
     * @return {!Promise<null>}
     */
    Wash.prototype.executeWashrc = function() {
      var washrc = new Washrc(this.executeContext);
      return washrc.execute(this);
    };

    /**
     * @param {string} name
     * @return {!Promise<Array>}
     */
    Wash.prototype.loadFile = function(name) {
      if (!name) {
        return Promise.reject(new AxiomError.Invalid('name', name));
      }
      return this.fileSystemManager.readFile(
          new Path(name), DataType.UTF8String).then(
        function(/** ReadResult */ result) {
          try {
            if (typeof result.data !== 'string') {
              return Promise.reject(new AxiomError.TypeMismatch(
                  'string', typeof result.data));
            }
            var data = JSON.parse(result.data);
            if (data instanceof Array)
              return Promise.resolve(data);
          } catch (ex) {
            this.errorln('Error loading: ' + name);
            this.printErrorValue(ex);
          }

          return Promise.resolve(null);
        }.bind(this)
      ).catch(
        function(err) {
          if (!AxiomError.NotFound.test(err))
            this.printErrorValue(err);

          return Promise.resolve([]);
        }.bind(this)
      );
    };

    /**
     * @param {string} path
     * @return {Path}
     */
    Wash.prototype.absPath = function(path) {
      /** @type {string} */
      var pwd = this.executeContext.getPwd();
      return Path.abs(pwd, path);
    };

    /**
     * @return {void}
     */
    Wash.prototype.setPrompt = function() {
      this.promptString_ = this.tc_.output('%set-attr(FG_BOLD, FG_CYAN)' +
          this.executeContext.getPwd() + '> %set-attr()');
    };

    /**
      * @typedef {{fileSystem: !FileSystem, statResult: !StatResult, path: !Path}}
      */
    var FindExecutableResult;

    /**
      * Returns the StatResult of a builtin command given its path, or null if
      * path does not resolve to a known builtin command.
      *
      * @param {!string} pathSpec
      * @return {!Promise<!FindExecutableResult>}
      */
    Wash.prototype.findBuiltinOrExecutable = function(pathSpec) {
      return this.findBuiltin(pathSpec).then(function(result) {
        if (result) {
          return Promise.resolve(result);
        }

        return washUtil.findExecutable(this.executeContext, pathSpec);
      }.bind(this));
    };

    /**
      * Returns the StatResult of a builtin command given its path, or null if
      * path does not resolve to a known builtin command.
      *
      * @param {!string} pathSpec
      * @return {!Promise<?FindExecutableResult>}
      */
    Wash.prototype.findBuiltin = function(pathSpec) {
      var builtinPath = this.builtinsFS.rootPath.combine(pathSpec);
      return this.builtinsFS.stat(builtinPath).then(
        function(statResult) {
          return Promise.resolve({
            fileSystem: this.builtinsFS,
            statResult: statResult,
            path: builtinPath
          });
        }.bind(this)
      ).catch(function(error) {
        if (AxiomError.NotFound.test(error))
          return null;
        return Promise.reject(error);
      });
    };

    /**
     * @return {!Promise<*>}
     */
    Wash.prototype.read = function() {
      return washUtil.findExecutable(this.executeContext, 'readline').then(
        function(result) {
          return this.executeContext.call(
              result.path,
              { 'prompt-string': this.promptString_,
                'input-history': this.inputHistory
              });
        }.bind(this));
    };

    /**
     * Evaluate a single line of input.
     *
     * @param {string} str
     * @return {!Promise<*>} Resolves to result of the evaluation.
     */
    Wash.prototype.evaluate = function(str) {
      str = str.trim();

      if (!str)
        return Promise.resolve();

      if (str != this.inputHistory[0])
        this.inputHistory.unshift(str);

      var commands = this.parseShellInput(str);
      return this.dispatch(commands).then(
        function(response) {
          this.setPrompt();
          return response;
        }.bind(this));
    };

    /**
     * Read a single line of input, eval it, print the result or an error.
     *
     * @return {Promise<*>} Resolves to result of the evaluation.
     */
    Wash.prototype.readEvalPrint = function() {
      return this.read().then(
        function(result) {
          if (result === null || result === 'exit') {
            if (!result)
              this.executeContext.stdout.write('exit\n');
            return this.exit();
          }

          if (typeof result != 'string') {
            return Promise.reject(new AxiomError.Runtime(
                'Unexpected type from readline: ' + (typeof result)));
          }

          return this.evaluate(result);
        }.bind(this)
      ).catch(
        function(error) {
          this.printErrorValue(error);
          return Promise.reject(error);
        }.bind(this)
      );
    };

    /**
     * Read-eval-print-loop.
     *
     * @return {Promise<*>} Resolves to the value of the final evaluation.
     */
    Wash.prototype.readEvalPrintLoop = function() {
      return this.readEvalPrint().then(
        function(value) {
          if (this.executeContext.isEphemeral('Ready'))
            return this.readEvalPrintLoop();

          return Promise.resolve(value);
        }.bind(this)
      ).catch(
        function(value) {
          if (!Wash.exitOnError) {
            if (this.executeContext.isEphemeral('Ready'))
              return this.readEvalPrintLoop();
          }

          return Promise.reject(value);
        }.bind(this)
      );
    };

    /**
     * @constructor
     * @param {!string} operator
     * @param {!string} pathSpec
     */
    Wash.RedirectInfo = function(operator, pathSpec) {
      /** @const @type {!string} */
      this.pathSpec = pathSpec;
      /** @const @type {!string} */
      this.mode = Wash.RedirectInfo.OP2MODE_[operator];

      if (!this.mode || (this.mode !== 'pipe' && this.pathSpec === ''))
        throw new AxiomError.Invalid('I/O redirection', operator + pathSpec);
    };

    Wash.RedirectInfo.OP2MODE_ = {
      '<': 'r',
      '>': 'wct',
      '>>': 'wc',
      '|': 'pipe'
    };

    Wash.RedirectInfo.PIPE = new Wash.RedirectInfo('|', '');

    /**
     * @constructor
     * @param {!string} pathSpec
     * @param {!string} argv
     * @param {?Wash.RedirectInfo} redirIn
     * @param {?Wash.RedirectInfo} redirOut
     */
    Wash.Command = function(pathSpec, argv, redirIn, redirOut) {
      /** @const @type {!string} */
      this.pathSpec = pathSpec;
      /** @const @type {!string} */
      this.argv = argv;
      /** @const @type {?Wash.RedirectInfo} */
      this.redirIn = redirIn;
      /** @const @type {?Wash.RedirectInfo} */
      this.redirOut = redirOut;
      /** @type {!boolean} */
      this.runnable = true;
    };

    /**
     * Matches a command line with possible stdout redirection to a file:
     *    command [arg1 arg2 ...] [< some_file] [> some_file]
     *
     * @private
     * @const
     */
    Wash.CMD_WITH_IO_REDIRECT_RE_ = /^([^<>]+?)(?:\s+([^<>]+?))?\s*([<>].+)?$/;
    Wash.STDIN_REDIRECT_RE_ = /(<)\s*([^<>\s]+)?/;
    Wash.STDOUT_REDIRECT_RE_ = /(>>?)\s*([^<>\s]+)?/;

    /**
     * Parse a line of shell input into the path and the argument string.
     *
     * @return {!Wash.Command}
     */
    Wash.prototype.parseShellCommand = function(str, pipeIn, pipeOut) {
      var match = Wash.CMD_WITH_IO_REDIRECT_RE_.exec(str);

      if (!match)
        throw new AxiomError.Invalid('command line', str);

      var path = match[1];
      var argv = match[2] || '';
      var redirStr = match[3];
      var redirIn = null;
      var redirOut = null;
      // TODO(ussuri): Add redirErr, too.

      if (path.substr(0, 2) == './') {
        /** @type {string} */
        var pwd = this.executeContext.getEnv('$PWD',
            this.executeContext.fileSystemManager.defaultFileSystem.rootPath.spec);
        path = pwd + '/' + path.substr(2);
      }

      if (redirStr) {
        match = Wash.STDIN_REDIRECT_RE_.exec(redirStr);
        if (match) {
          redirIn = new Wash.RedirectInfo(match[1], match[2]);
        }
        match = Wash.STDOUT_REDIRECT_RE_.exec(redirStr);
        if (match) {
          redirOut = new Wash.RedirectInfo(match[1], match[2]);
        }
      }

      if (!redirIn && pipeIn) {
        redirIn = Wash.RedirectInfo.PIPE;
      }

      if (!redirOut && pipeOut) {
        redirOut = Wash.RedirectInfo.PIPE;
      }

      return new Wash.Command(path, argv, redirIn, redirOut);
    };

    Wash.prototype.parseShellInput = function(str) {
      var commands = [];
      var commandStrs = str.split(/\s*\|\s*/);
      for (var i = 0; i < commandStrs.length; ++i) {
        var pipeIn = i > 0;
        var pipeOut = i < commandStrs.length - 1;
        var cmd = this.parseShellCommand(commandStrs[i], pipeIn, pipeOut);
        commands.push(cmd);
      }
      return commands;
    };

    /**
     * Create a chain of Stdios that are cloned from our master stdio, but piped
     * into each other and possibly redirected from/to a file. Redirection takes
     * precedence over piping: e.g. if a command is on the RHS of a pipe but also
     * has its stdin redirected from a file, the pipe is ignored.
     *
     * @param {!Array<Wash.Command>} commands
     * @return {!Promise<!Array<!Stdio>>}
     */
    Wash.prototype.createStdios = function(commands) {
      var stdios = [];
      var redirFilePromises = [];
      var curPipe = null;

      /**
       * @param {!Wash} wash
       * @param {!StreamBuffer} buffer
       * @return {void}
       */
      var closeBufferOnInterrupt = function(wash, buffer) {
        wash.executeContext.stdio.signal.onData.addListener(function(signal) {
          if (signal === 'interrupt') {
            buffer.close('Interrupted');
          }
        });
      };

      /**
       * @param {!Wash} wash
       * @param {!(ReadableFileStreamBuffer|WritableFileStreamBuffer)} fileBuffer
       * @param {!Wash.Command} command
       * @return {void}
       */
      var openRedirFileBuffer = function(wash, buffer, command) {
        closeBufferOnInterrupt(wash, buffer);
        return buffer.open().catch(function(error) {
          // Just report the error: if open() fails, file buffer will auto-close.
          wash.printErrorValue(error);
          command.runnable = false;
        });
      };

      for (var i = 0; i < commands.length; ++i) {
        var cmd = commands[i];
        var stdio = this.executeContext.stdio.clone();

        // NOTE: redirection to or from a file take precedence over piping; given:
        //   $ cat foo.txt | sort < bar.txt > baz.txt | tee goo.txt
        // `sort` will ignore the both piped stdin and stdout, reading from bar.txt
        // and writing to baz.txt instead.

        if (cmd.redirIn) {
          if (cmd.redirIn === Wash.RedirectInfo.PIPE) {
            if (!curPipe) {
              // The pipe's LHS command's stdout was redirected to a file, so we
              // have no pipe: create a dummy one (/dev/null) for this command.
              curPipe = new MemoryStreamBuffer();
              curPipe.flush();
            }
            // `cmd` is the RHS of a pipe: consume the readable end of a buffer
            // created on the previous loop iteration for the LHS command.
            stdio.stdin = curPipe.readableStream;
          } else {
            // TODO(ussuri): A fixed data type is temporary. Switch to auto-detection
            // once the data type story is sorted out.
            var fileReader = new ReadableFileStreamBuffer(
                this.fileSystemManager,
                this.absPath(cmd.redirIn.pathSpec),
                DataType.UTF8String,
                cmd.redirIn.mode);
            redirFilePromises.push(openRedirFileBuffer(this, fileReader, cmd));
            stdio.stdin = fileReader.readableStream;
          }
        }

        if (cmd.redirOut) {
          if (cmd.redirOut === Wash.RedirectInfo.PIPE) {
            curPipe = new MemoryStreamBuffer();
            closeBufferOnInterrupt(this, curPipe);
            stdio.stdout = curPipe.writableStream;
          } else {
            curPipe = null;
            // TODO(ussuri): A fixed data type is temporary. Switch to auto-detection
            // once the data type story is sorted out.
            var fileWriter = new WritableFileStreamBuffer(
                this.fileSystemManager,
                this.absPath(cmd.redirOut.pathSpec),
                DataType.UTF8String,
                cmd.redirOut.mode);
            redirFilePromises.push(openRedirFileBuffer(this, fileWriter, cmd));
            stdio.stdout = fileWriter.writableStream;
          }
        }

        stdios.push(stdio);
      }

      return Promise.all(redirFilePromises).then(function(_) {
        return stdios;
      });
    };

    /**
     * Dispatche execution of a command pipe consisting of one or more commands,
     * which can also have their stdin and/or stdout redirected from/to a file,
     * and return a promise that resolves with an array of commands' results.
     *
     * @param {!Array<!Wash.Command>} commands
     * @return {!Promise<!Array<*>>}
     */
    Wash.prototype.dispatch = function(commands) {
      return this.createStdios(commands).then(function(stdios) {
        /** @type {!Array<!Promise<undefined>> } */
        var promises = [];
        // Going from right to left is important: we want to fire up each pipe's
        // consumer before its producer, so the consumer can prepare for the data
        // about to be piped in.
        for (var i = commands.length - 1; i >= 0; --i) {
          var cmd = commands[i];
          var stdio = stdios[i];
          if (cmd.runnable) {
            promises.push(this.dispatchOne(cmd, stdio));
          } else {
            // The command is not runnable: if it's an LHS of a pipe, then make the
            // corresponding stdout look like an empty /dev/null to the RHS command
            // by ending it in a delayed fashion. As soon as the RHS resumes its
            // stdin (connected to this stdout) or explicitly reads from it, it will
            // receive an onEnd for it.
            if (cmd.redirOut === Wash.RedirectInfo.PIPE) {
              var stdout = stdio.stdout;
              stdout.write('', stdout.end.bind(stdout));
            }
          }
        }
        return Promise.all(promises);
      }.bind(this));
    };

    /**
     * Run the given path with the given argv string, returning a promise that
     * resolves to the result of the evaluation.
     *
     * For relative paths we'll search the builtins as well as $PATH.  The argv
     * string will be parsed according to the sigil of the target executable.
     *
     * @param {!Wash.Command} command
     * @param {!Stdio} stdio
     */
    Wash.prototype.dispatchOne = function(command, stdio) {
      return this.findBuiltinOrExecutable(command.pathSpec).then(function(result) {
        var arg = this.parseArgv(result.statResult.signature, command.argv);

        // TODO(ussuri): Move this into ExecuteContext.call() and remove
        // opt_onClose there?
        var onClose = function(reason, value) {
          if (reason === 'ok') {
            if (typeof value !== 'undefined' && typeof value !== 'number' &&
                value !== null) {
              stdio.stdout.write(JSON.stringify(value, null, '  ') + '\n');
            }
          }
        };

        return this.executeContext.call(
            result.path, arg, stdio, onClose, result.fileSystem);
      }.bind(this));
    };

    /**
     * @param {Object} signature
     * @param {string} argv
     * @return {Arguments}
     */
    Wash.prototype.parseArgv = function(signature, argv) {
      if (!argv)
        argv = '';

      var parse = new Parse(argv);
      return parse.parseArgs(signature);
    };

    /**
     * @param {*} value
     * @param {boolean=} opt_withStackTrace
     */
    Wash.prototype.printErrorValue = function(value, opt_withStackTrace) {
      var args = [];
      if (!(value instanceof AxiomError)) {
        if (value instanceof Error) {
          //console.log('printErrorValue:', value, value.stack);
          var stack = value.stack;
          value = new AxiomError.Runtime(value.message);
          value.stack = stack;
        } else if (value instanceof Object) {
          value = new AxiomError.Runtime(value.toString());
        } else {
          value = new AxiomError.Runtime(JSON.stringify(value));
        }
      }

      for (var key in value.errorValue) {
        args.push(key + ': ' + JSON.stringify(value.errorValue[key]));
      }

      var str = this.tc_.output('%set-attr(FG_BOLD, FG_RED)Error%set-attr(): ' +
                                value.errorName);
      if (args.length)
        str += ' {' + args.join(', ') + '}';

      if (opt_withStackTrace && !AxiomError.Interrupt.test(value) && value.stack)
        str += '\n' + value.stack;

      this.errorln(str);
    };

    Wash.prototype.exit = function() {
      if (!this.historyFile)
        return this.executeContext.closeOk(null);

      return this.fileSystemManager.writeFile(
          new Path(this.historyFile),
          DataType.UTF8String,
          JSON.stringify(this.inputHistory, null, '  ') + '\n'
      ).then(
          function() {
            return this.executeContext.closeOk(null);
          }.bind(this)
      ).catch(
        function(error) {
          // TODO: writeFile should only raise AxiomErrors.
          //if (error instanceof window.FileError)
          //  error = domfsUtil.convertFileError(this.historyFile, error);

          this.printErrorValue(error);
          this.executeContext.closeOk(null);
        }.bind(this)
      );
    };

    /**
     * @param {!string} str
     * @return {void}
     */
    Wash.prototype.println = function(str) {
      this.executeContext.stdout.write(str + '\n');
    };

    /**
     * @param {!string} str
     * @return {void}
     */
    Wash.prototype.errorln = function(str) {
      this.executeContext.stderr.write(str + '\n');
    };
  }
);

//# sourceMappingURL=wash.js.map
define(
  "wash/exe/yes",
  ["axiom/core/ephemeral", "exports"],
  function(axiom$core$ephemeral$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
      cx.ready();

      if (cx.getArg('help', false)) {
        cx.stdout.write([
          'Usage: yes [VALUE]...',
          '',
          'Options:',
          '',
          '  -h, --help',
          '      Print this help message and exit.',
          '',
          'Repeatedly output a line with all specified VALUE(s), or "y" by default.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      var printStr = cx.getArg('_', ['y']).join(' ') + '\n';
      var printFunc = function() {
        if (cx.isEphemeral(Ephemeral.State.Ready)) {
          cx.stdout.write(printStr);
          setTimeout(printFunc, 10);
        }
      };
      printFunc();
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      '_': '@',
      'help|h': '?'
    };
  }
);

//# sourceMappingURL=yes.js.map
define(
  "wash/exe_modules",
  ["wash/exe/cat", "wash/exe/chrome", "wash/exe/clear", "wash/exe/cp", "wash/exe/echo", "wash/exe/eval", "wash/exe/import", "wash/exe/ls", "wash/exe/mkdir", "wash/exe/mkstream", "wash/exe/mount.gdrive", "wash/exe/mount", "wash/exe/mount.stream", "wash/exe/mv", "wash/exe/pwd", "wash/exe/readline", "wash/exe/rm", "wash/exe/sort", "wash/exe/tee", "wash/exe/touch", "wash/exe/wash", "wash/exe/yes", "exports"],
  function(
    wash$exe$cat$$,
    wash$exe$chrome$$,
    wash$exe$clear$$,
    wash$exe$cp$$,
    wash$exe$echo$$,
    wash$exe$eval$$,
    wash$exe$import$$,
    wash$exe$ls$$,
    wash$exe$mkdir$$,
    wash$exe$mkstream$$,
    wash$exe$mount$gdrive$$,
    wash$exe$mount$$,
    wash$exe$mount$stream$$,
    wash$exe$mv$$,
    wash$exe$pwd$$,
    wash$exe$readline$$,
    wash$exe$rm$$,
    wash$exe$sort$$,
    wash$exe$tee$$,
    wash$exe$touch$$,
    wash$exe$wash$$,
    wash$exe$yes$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var m0;
    m0 = wash$exe$cat$$["default"];
    var m1;
    m1 = wash$exe$chrome$$["default"];
    var m2;
    m2 = wash$exe$clear$$["default"];
    var m3;
    m3 = wash$exe$cp$$["default"];
    var m4;
    m4 = wash$exe$echo$$["default"];
    var m5;
    m5 = wash$exe$eval$$["default"];
    var m6;
    m6 = wash$exe$import$$["default"];
    var m7;
    m7 = wash$exe$ls$$["default"];
    var m8;
    m8 = wash$exe$mkdir$$["default"];
    var m9;
    m9 = wash$exe$mkstream$$["default"];
    var m10;
    m10 = wash$exe$mount$gdrive$$["default"];
    var m11;
    m11 = wash$exe$mount$$["default"];
    var m12;
    m12 = wash$exe$mount$stream$$["default"];
    var m13;
    m13 = wash$exe$mv$$["default"];
    var m14;
    m14 = wash$exe$pwd$$["default"];
    var m15;
    m15 = wash$exe$readline$$["default"];
    var m16;
    m16 = wash$exe$rm$$["default"];
    var m17;
    m17 = wash$exe$sort$$["default"];
    var m18;
    m18 = wash$exe$tee$$["default"];
    var m19;
    m19 = wash$exe$touch$$["default"];
    var m20;
    m20 = wash$exe$wash$$["default"];
    var m21;
    m21 = wash$exe$yes$$["default"];
    var dir = {};
    __es6_export__("dir", dir);
    __es6_export__("default", dir);
    dir["cat"] = m0;
    dir["chrome"] = m1;
    dir["clear"] = m2;
    dir["cp"] = m3;
    dir["echo"] = m4;
    dir["eval"] = m5;
    dir["import"] = m6;
    dir["ls"] = m7;
    dir["mkdir"] = m8;
    dir["mkstream"] = m9;
    dir["mount.gdrive"] = m10;
    dir["mount"] = m11;
    dir["mount.stream"] = m12;
    dir["mv"] = m13;
    dir["pwd"] = m14;
    dir["readline"] = m15;
    dir["rm"] = m16;
    dir["sort"] = m17;
    dir["tee"] = m18;
    dir["touch"] = m19;
    dir["wash"] = m20;
    dir["yes"] = m21;
  }
);

//# sourceMappingURL=exe_modules.js.map
define(
  "wash/parse",
  ["axiom/core/error", "axiom/fs/arguments", "exports"],
  function(axiom$core$error$$, axiom$fs$arguments$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Arguments;
    Arguments = axiom$fs$arguments$$["default"];
    var Parse = function(source, opt_pos) {
      /**
       * @type {string} The source string.
       */
      this.source = source;

      /**
       * @type {number} The current position.
       */
      this.pos = opt_pos || 0;

      /**
       * @type {string} The character at the current position.
       */
      this.ch = this.source.substr(this.pos, 1);
    };

    __es6_export__("Parse", Parse);
    __es6_export__("default", Parse);

    /**
     * @param {string} message
     * @return {AxiomError}
     */
    Parse.prototype.error = function(message) {
      return new AxiomError.Parse(message, this.pos);
    };

    /**
     * Advance the current position.
     *
     * @param {number} count
     */
    Parse.prototype.advance = function(count) {
      this.pos += count;
      this.ch = this.source.substr(this.pos, 1);
    };

    /**
     * Parse from the current position, expecting to find command-line arguments
     * as described by `signature`.
     *
     * Returns a new Arguments object.
     *
     * @param {Object} signature
     * @param {Object=} opt_defaults
     * @return {Arguments}
     */
    Parse.prototype.parseArgs = function(signature, opt_defaults) {
      var args = new Arguments(signature, opt_defaults || {});

      var loose = [];

      var nextArg = function() {
        if (this.ch == '-') {
          this.advance(1);
          var name;

          if (this.ch == '-') {
            // double-dash parameter
            this.advance(1);
            name = this.parsePattern(/[a-z0-9\-\_]+/ig);
          } else if (!this.ch || /\s/.test(this.ch)) {
            // loose '-'
            loose.push('-');
            return;
          } else {
            name = this.ch;
            this.advance(1);
          }

          var record;
          if (/^no-/.test(name)) {
            name = name.substr(3);
            record = args.getRecord(name);
            if (!record)
              throw this.error('Unknown argument: ' + name);

            if (record.sigil != '?')
              throw this.error('Not a boolean argument: ' + name);

            record.setValue(false);
            return;
          }

          record = args.getRecord(name);
          if (!record)
            throw this.error('Unknown argument: ' + name);

          if (record.sigil == '?') {
            record.setValue(true);
            return;
          }

          this.skipSpace();
          if (this.ch == '=') {
            this.advance(1);
            this.skipSpace();
          }

          if (record.sigil == '$') {
            record.setValue(this.parseSloppyString());
            return;
          }

          if (record.sigil == '%') {
            record.setValue(this.parseObject());
            return;
          }

          if (record.sigil == '@') {
            record.setValue(this.parseArray());
            return;
          }

          if (record.sigil == '*') {
            record.setValue(this.parseValue());
            return;
          }

          throw this.error('Unknown arg sigil: ' + record.sigil);
        } else {
          loose.push(this.parseValue());
        }
      };

      this.skipSpace();

      while (this.pos < this.source.length) {
        var lastPos = this.pos;

        nextArg.call(this);

        if (this.pos == lastPos)
          throw this.error('internal error: Parser did not advance position');

        this.skipSpace();
      }

      if (loose.length) {
        var record = args.getRecord('_');
        var value;

        if (record) {
          if (record.sigil !== '@')
            throw this.error('Can\'t parse loose sigil: ' + record.sigil);

          args.setValue('_', loose);
        }
      }

      return args;
    };

    /**
     * Parse from the current position, without expectations about what we'll find.
     *
     * If it looks like we're starting with an object ('{') or array ('[') literal,
     * then we'll defer to the appropriate parse method.  If not, we'll assume it's
     * a string which may or may not be quoted.
     *
     * @param {RegExp=} opt_sloppyPattern Optional patter to be used for sloppy
     *   string parsing.
     * @return {*}
     */
    Parse.prototype.parseValue = function(opt_sloppyPattern) {
      if (this.ch == '[')
        return this.parseArray();

      if (this.ch == '{')
        return this.parseObject();

      return this.parseSloppyString(opt_sloppyPattern);
    };

    /**
     * Parse from the current position, expecting to find an array literal.
     *
     * The array literal can be specified in relaxed version of JSON, which
     * allows for quotes to be left out of values.
     *
     * The array literal may contain objects or arrays nested arbitrarily deep.
     *
     * @return {Array}
     */
    Parse.prototype.parseArray = function() {
      if (this.ch != '[')
        throw this.error('Expected "["');

      this.advance(1);

      var rv = [];
      if (this.ch == ']') {
        this.advance(1);
        return rv;
      }

      while (this.pos < this.source.length) {
        this.skipSpace();

        rv.push(this.parseValue());

        this.skipSpace();

        if (this.ch == ',') {
          this.advance(1);
          continue;
        }

        if (this.ch == ']') {
          this.advance(1);
          return rv;
        }

        throw this.error('Expected "," or "]"');
      }

      throw this.error('Unterminated array');
    };

    /**
     * Parse from the current position, expecting to find an object literal.
     *
     * The object literal can be specified in relaxed version of JSON, which
     * allows for quotes to be left out of keys and values.
     *
     * The object literal may contain objects or arrays nested arbitrarily deep.
     *
     * @return {Object}
     */
    Parse.prototype.parseObject = function() {
      if (this.ch != '{')
        throw this.error('Expected {');

      this.advance(1);
      this.skipSpace();

      var rv = {};
      if (this.ch == '}') {
        this.advance(1);
        return rv;
      }

      while (this.pos < this.source.length) {
        this.skipSpace();

        // We explicitly add colon to the list of chars to disallow in a sloppy
        // key name, so we don't eat the name: value delimiter.
        var name = this.parseSloppyString(/[^\s,{}\[\]:]+/g);
        this.skipSpace();
        if (this.ch != ':')
          throw this.error('Expected :');

        this.advance(1);
        this.skipSpace();

        var value = this.parseValue();
        rv[name] = value;
        this.skipSpace();

        if (this.ch == ',') {
          this.advance(1);
          continue;
        }

        if (this.ch == '}') {
          this.advance(1);
          return rv;
        }

        throw this.error('Expected "," or "}"');
      }

      throw this.error('Unterminated object literal');
    };

    /**
     * Parse an escape code from the current position (which should point to
     * the first character AFTER the leading backslash.)
     *
     * @return {string}
     */
    Parse.prototype.parseEscape = function() {
      var map = {
        '"': '"',
        '\'': '\'',
        '\\': '\\',
        'a': '\x07',
        'b': '\x08',
        'e': '\x1b',
        'f': '\x0c',
        'n': '\x0a',
        'r': '\x0d',
        't': '\x09',
        'v': '\x0b',
        'x': function() {
          var value = this.parsePattern(/[a-z0-9]{2}/ig);
          return String.fromCharCode(parseInt(value, 16));
        },
        'u': function() {
          var value = this.parsePattern(/[a-z0-9]{4}/ig);
          return String.fromCharCode(parseInt(value, 16));
        }
      };

      if (!(this.ch in map))
        throw this.error('Unknown escape: ' + this.ch);

      var value = map[this.ch];
      this.advance(1);

      if (typeof value == 'function')
        value = value.call(this);

      return value;
    };

    /**
     * Parse a string that may or may not be quoted.
     *
     * @param {RegExp=} opt_pattern Optional pattern specifying what constitutes
     *   a valid run of characters.
     * @return {?(string|boolean|number)}
     */
    Parse.prototype.parseSloppyString = function(opt_pattern) {
      if (this.ch == '"' || this.ch == '\'')
        return this.parseString();

      return this.parsePattern(opt_pattern || /[^\s,{}\[\]]+/g);
    };

    /**
     * Parse a single or double quoted string.
     *
     * The current position should point at the initial quote character.  Single
     * quoted strings will be treated literally, double quoted will process escapes.
     *
     * TODO(rginda): Variable interpolation.
     *
     * @param {ParseState} parseState
     * @param {string} quote A single or double-quote character.
     * @return {string}
     */
    Parse.prototype.parseString = function() {
      var result = '';

      var quote = this.ch;
      if (quote != '"' && quote != '\'')
        throw this.error('String expected');

      this.advance(1);

      var re = new RegExp('[\\\\' + quote + ']', 'g');

      while (this.pos < this.source.length) {
        re.lastIndex = this.pos;
        if (!re.exec(this.source))
          throw this.error('Unterminated string literal');

        result += this.source.substring(this.pos, re.lastIndex - 1);

        this.advance(re.lastIndex - this.pos - 1);

        if (quote == '"' && this.ch == '\\') {
          this.advance(1);
          result += this.parseEscape();
          continue;
        }

        if (quote == '\'' && this.ch == '\\') {
          result += this.ch;
          this.advance(1);
          continue;
        }

        if (this.ch == quote) {
          this.advance(1);
          return result;
        }
      }

      throw this.error('Unterminated string literal');
    };

    /**
     * Parse the given pattern starting from the current position.
     *
     * @param {RegExp} pattern A pattern representing the characters to span.  MUST
     *   include the "global" RegExp flag.
     * @return {?(string|boolean|number)}
     */
    Parse.prototype.parsePattern = function(pattern) {
      if (!pattern.global)
        throw this.error('Internal error: Span patterns must be global');

      pattern.lastIndex = this.pos;
      var ary = pattern.exec(this.source);

      if (!ary || pattern.lastIndex - ary[0].length != this.pos)
        throw this.error('Expected match for: ' + pattern);

      this.pos = pattern.lastIndex - 1;
      this.advance(1);

      var res = ary[0];
      if (!isNaN(+res))
        res = +res;
      else if (res === 'true')
        res = true;
      else if (res === 'false')
        res = false;
      else if (res === 'null')
        res = null;

      return res;
    };

    /**
     * @param {string=} opt_expect A list of valid non-whitespace characters to
     *   terminate on.
     * @return {void}
     */
    Parse.prototype.skipSpace = function(opt_expect) {
      if (!/\s/.test(this.ch))
        return;

      var re = /\s+/gm;
      re.lastIndex = this.pos;

      var source = this.source;
      if (re.exec(source))
        this.pos = re.lastIndex;

      this.ch = this.source.substr(this.pos, 1);

      if (opt_expect) {
        if (this.ch.indexOf(opt_expect) == -1) {
          throw this.error('Expected one of ' + opt_expect + ', found: ' +
              this.ch);
        }
      }
    };
  }
);

//# sourceMappingURL=parse.js.map
define("wash/string_utils", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var lpad = function(str, length, opt_ch) {
    str = String(str);
    opt_ch = opt_ch || ' ';

    while (str.length < length)
      str = opt_ch + str;

    return str;
  };

  __es6_export__("lpad", lpad);
  var zpad = function(number, length) {
    return lpad(number.toString(), length, '0');
  };

  __es6_export__("zpad", zpad);
  var getWhitespace = function(length) {
    if (length === 0)
      return '';

    var f = getWhitespace;
    if (!f.whitespace)
      f.whitespace = '          ';

    while (length > f.whitespace.length) {
      f.whitespace += f.whitespace;
    }

    return f.whitespace.substr(0, length);
  };
  __es6_export__("getWhitespace", getWhitespace);
});

//# sourceMappingURL=string_utils.js.map
define("wash/termcap", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

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

  /**
   * @constructor
   *
   * Class used to convert lib.replaceVars-like strings into actual terminal
   * escape.
   *
   * This is roughly analogous to Linux's termcap library.
   *
   * Instances of this class are able to translate both outgoing strings and
   * incoming key sequences.
   */
  var Termcap = function() {};
  __es6_export__("Termcap", Termcap);
  __es6_export__("default", Termcap);

  /**
   * Replace %<function>(VAR,...) and %(VAR) patterns in the given string, using
   * the set of output functions and variables.
   *
   * Use this for string you intend to write to the terminal.  For example,
   * the default prompt for wash: '%set-attr(FG_BOLD, FG_CYAN)wash$ %set-attr()'.
   *
   * See the outputVars and outputFunctions below for the list of valid stuff.
   * @param {string} str
   * @param {Object=} opt_vars
   */
  Termcap.prototype.output = function(str, opt_vars) {
    var vars;
    if (opt_vars) {
      vars = Object.create(this.outputVars);
      for (var key in opt_vars) {
        vars[key] = opt_vars[key];
      }
    } else {
      vars = this.outputVars;
    }

    return Termcap.replaceVars_(str, vars, this.outputFunctions);
  };

  /**
   * Replace %<function>(VAR,...) and %(VAR) patterns in the given string, using
   * the set of output functions and variables.
   *
   * Use this to convert mnemonic keystrokes into their byte sequences.  For
   * example, some default keybindings from lib_wa_readline.js:
   *
   *  '%ctrl("_")': 'undo',
   *  '%ctrl("/")': 'undo',
   *
   *  '%ctrl(LEFT)': 'backward-word',
   *  '%ctrl(RIGHT)': 'forward-word',
   *
   *  '%meta(BACKSPACE)': 'backward-kill-word',
   *  '%meta(DELETE)': 'kill-word',
   *
   * See the inputVars and inputFunctions below for the list of valid stuff.
   * 
   * @param {string} str
   * @param {Object=} opt_vars
   */
  Termcap.prototype.input = function(str, opt_vars) {
    var vars;
    if (opt_vars) {
      vars = Object.create(this.inputVars);
      for (var key in opt_vars) {
        vars[key] = opt_vars[key];
      }
    } else {
      vars = this.inputVars;
    }

    return Termcap.replaceVars_(str, vars, this.inputFunctions);
  };

  /**
   * The valid variables for Termcap..output()
   */
  Termcap.prototype.outputVars = {
    'FG_BOLD': '1',

    'FG_BLACK': '30',
    'FG_RED': '31',
    'FG_GREEN': '32',
    'FG_YELLOW': '33',
    'FG_BLUE': '34',
    'FG_MAGENTA': '35',
    'FG_CYAN': '36',
    'FG_WHITE': '37',
    'FG_DEFAULT': '39',

    'BG_BLACK': '40',
    'BG_RED': '41',
    'BG_GREEN': '42',
    'BG_YELLOW': '43',
    'BG_BLUE': '44',
    'BG_MAGENTA': '45',
    'BG_CYAN': '46',
    'BG_WHITE': '47',
    'BG_DEFAULT': '49',
  };

  /**
   * The valid functions for Termcap..output()
   */
  Termcap.prototype.outputFunctions = {
    'clear-terminal': function() {
      return '\x1b[2J';
    },

    'crlf': function(str) {
      return str.replace(/\n/g, '\r\n');
    },

    'set-attr': function(/* ... */) {
      var args = ['0'];
      args.push.apply(args, arguments);
      return '\x1b[' + args.join(';') + 'm';
    },

    'add-attr': function(/* ... */) {
      var args = [];
      args.push.apply(args, arguments);
      return '\x1b[' + args.join(';') + 'm';
    },

    'insert-blank': function(opt_count) {
      return ('\x1b[' + (opt_count || '') + '@');
    },

    'erase-chars': function(opt_count) {
      return ('\x1b[' + (opt_count || '') + 'X');
    },

    'erase-right': function() {
      return ('\x1b[K');
    },

    'set-row-column': function(row, column) {
      if (isNaN(row) || isNaN(column))
        throw new Error('Invalid row/column: ' + row + ', ' + column);
      return '\x1b[' + row + ';' + column + 'H';
    },

    'cursor-left': function(opt_count) {
      return ('\x1b[' + (opt_count || '') + 'D');
    },

    'cursor-right': function(opt_count) {
      return ('\x1b[' + (opt_count || '') + 'C');
    },

    'bell': function() {
      return ('\x07');
    },

    'insert-lines': function(opt_count) {
      return ('\x1b[' + (opt_count || '') + 'L');
    },

    'get-row-column': function() {
      return ('\x1b[6n');
    }
  };

  /**
   * The valid variables for Termcap..input()
   */
  Termcap.prototype.inputVars = {
    'BACKSPACE': '\x7f',
    'DELETE': '\x1b[3~',
    'DOWN': '\x1b[B',
    'END': '\x1b[F',
    'ENTER': '\r',
    'HOME': '\x1b[H',
    'INSERT': '\x1b[2~',
    'LEFT': '\x1b[D',
    'META': '\x1b',
    'PGDN': '\x1b[6~',
    'PGUP': '\x1b[5~',
    'RIGHT': '\x1b[C',
    'UP': '\x1b[A',
  };


  /**
   * The valid functions for Termcap..input()
   */
  Termcap.prototype.inputFunctions = {
    'shift': function(seq) {
      if (/\x1b\[/.test(seq))
        return Termcap.modcsi(';2', seq);

      if (seq.length == 1)
        return seq.toUpperCase();

      throw new Error('Invalid ctrl sequence: ' + seq);
    },

    'meta': function(seq) {
      if (/\x1b\[/.test(seq))
        return Termcap.modcsi(';3', seq);

      return '\x1b' + seq;
    },

    'shift-meta': function(seq) {
      if (/\x1b\[/.test(seq))
        return Termcap.modcsi(';4', seq);

      return '\x1b' + seq.toUpperCase();
    },

    'ctrl': function(seq) {
      if (/\x1b\[/.test(seq))
        return Termcap.modcsi(';5', seq);

      if (seq.length == 1)
        return String.fromCharCode(seq.toUpperCase().charCodeAt(0) - 64);

      throw new Error('Invalid ctrl sequence: ' + seq);
    },

    'shift-ctrl': function(seq) {
      if (/\x1b\[/.test(seq))
        return Termcap.modcsi(';6', seq);

      if (seq.length == 1)
        return String.fromCharCode(seq.toUpperCase().charCodeAt(0) - 64);

      throw new Error('Invalid shift-ctrl sequence: ' + seq);
    },

    'ctrl-meta': function(seq) {
      if (/\x1b\[/.test(seq))
        return Termcap.modcsi(';7', seq);

      if (seq.length == 1) {
        return '\x1b' + String.fromCharCode(
            seq.toUpperCase().charCodeAt(0) - 64);
      }

      throw new Error('Invalid ctrl-meta sequence: ' + seq);
    },

    'shift-ctrl-meta': function(seq) {
      if (/\x1b\[/.test(seq))
        return Termcap.modcsi(';8', seq);

      if (seq.length == 1) {
        return '\x1b' + String.fromCharCode(
            seq.toUpperCase().charCodeAt(0) - 64);
      }

      throw new Error('Invalid shift-ctrl-meta sequence: ' + seq);
    },
  };

  /**
   * Similar to lib.f.replaceVars, but allows for multiple-parameter functions
   * and string and integer literals.
   *
   * TODO(rginda): String literals are brittle.  We only check that they start
   * and end with double-quotes.  Comma-splitting is also brittle, and strings
   * containing commas will cause trouble.
   */
  Termcap.replaceVars_ = function(str, vars, functions) {
    var resolve = function(param, source) {
      if ((/^-?\d+$/.test(param)))
        return param;

      if ((/^\".*\"$/.test(param))) {
        return param.slice(1, -1);
      }

      if (typeof vars[param] == 'undefined') {
        throw new Error('Unknown variable: ' + source + ': ' + param);
      }

      return vars[param];
    };

    var doReplace = function(match, fn, paramstr) {
      if (!fn && !paramstr)
        return '%()';

      var ary;
      if (paramstr) {
        ary = paramstr.split(/\s*,\s*/);

        for (var i = 0; i < ary.length; ++i) {
          ary[i] = resolve(ary[i], '%' + fn + '(' + paramstr + ')');
        }
      }

      if (fn) {
        if (!(fn in functions))
          throw new Error('Unknown escape function: ' + fn);

        return functions[fn].apply(null, ary);
      }

      if (ary.length != 1)
        throw new Error('Expected single argument, got: ' + paramstr);

      return ary[0];
    };

    return str.replace(/%([a-z0-9+\-_]*)\(([^\)]*)\)/gi, doReplace);
  };

  Termcap.modcsi = function(mod, seq) {
    if (seq.length == 3) {
      // Some of the CSI sequences have zero parameters unless modified.
      return '\x1b[1' + mod + seq.substr(2, 1);
    }

    // Others always have at least one parameter.
    return seq.substr(0, seq.length - 1) + mod + seq.substr(seq.length - 1);
  };
});

//# sourceMappingURL=termcap.js.map
define("wash/version", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var version = "1.0.4";
  __es6_export__("version", version);
  __es6_export__("default", version);
});

//# sourceMappingURL=version.js.map
define(
  "wash/wash_util",
  ["axiom/fs/path", "axiom/core/error", "exports"],
  function(axiom$fs$path$$, axiom$core$error$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var Path;
    Path = axiom$fs$path$$["default"];
    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var washUtil = {};
    __es6_export__("washUtil", washUtil);
    __es6_export__("default", washUtil);

    /** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
    var ExecuteContext;

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    /**
      * @typedef {{fileSystem: !FileSystem, path: !Path, statResult: !StatResult}}
      */
    var FindExecutableResult;

    /**
     * @param {ExecuteContext} cx
     * @param {string} pathSpec
     * @return {!Promise<!FindExecutableResult>}
     */
    washUtil.findExecutable = function(cx, pathSpec) {
      // If path is absolute, find it directly.
      var path = new Path(pathSpec);
      if (path.isValid) {
        return washUtil.findExecutableAt_(cx, path);
      }

      // Otherwise, use "@PATH" as a list of prefixes for the path.
      var rootPath = cx.fileSystemManager.defaultFileSystem.rootPath;
      var searchList = cx.getEnv('@PATH', [rootPath.spec]);

      /** @type {function(): !Promise<!FindExecutableResult>} */
      var searchNextPath = function() {
        if (!searchList.length)
          return Promise.reject(new AxiomError.NotFound('path', pathSpec));

        var currentPrefix = searchList.shift();
        var currentPath = new Path(currentPrefix).combine(pathSpec);
        return washUtil.findExecutableAt_(cx, currentPath).then(
          function(result) {
            return result;
          },
          function(error) {
            if (AxiomError.NotFound.test(error))
              return searchNextPath();

            return Promise.reject(error);
          }
        );
      };

      return searchNextPath();
    };

    /**
     * @param {ExecuteContext} cx
     * @param {string} pathSpec
     * @return {!Promise<!FindExecutableResult>}
     */
    washUtil.findExecutableAt_ = function(cx, path) {
      return cx.fileSystemManager.stat(path).then(
        function(statResult) {
          if (statResult.mode & Path.Mode.X) {
            return Promise.resolve({
                fileSystem: cx.fileSystemManager,
                path: path,
                statResult: statResult
            });
          }
          return Promise.reject(new AxiomError.NotFound('path', path.originalSpec));
        }
      );
    };
  }
);

//# sourceMappingURL=wash_util.js.map
define(
  "wash/washrc",
  ["axiom/fs/path", "axiom/core/error", "axiom/fs/data_type", "wash/wash_util", "exports"],
  function(
    axiom$fs$path$$,
    axiom$core$error$$,
    axiom$fs$data_type$$,
    wash$wash_util$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var Path;
    Path = axiom$fs$path$$["default"];
    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var washUtil;
    washUtil = wash$wash_util$$["default"];

    /** @typedef ReadResult$$module$axiom$fs$read_result */
    var ReadResult;

    /**
     * @constructor
     *
     * Class exposing the read / write interface for washrc.
     * The interface is exposed to all executables, which can dynamically read
     * write into the washrc file.
     */
    var Washrc = function(cx) {
      var defaultHome = cx.fileSystemManager.defaultFileSystem.rootPath.spec;
      this.path = Path.join(cx.getEnv('$HOME', defaultHome), '.washrc');
      this.cx = cx;
    };
    __es6_export__("Washrc", Washrc);
    __es6_export__("default", Washrc);

    /**
     * @return {!Promise<Array>}
     */
    Washrc.prototype.read = function() {

      var commands = [];
      return this.cx.fileSystemManager.readFile(
          new Path(this.path), DataType.UTF8String).then(
        function(/** ReadResult */ result) {
          try {
            if (typeof result.data != 'string') {
              return Promise.reject(new AxiomError.TypeMismatch(
                  'string', typeof result.data));
            }
            var data = JSON.parse(result.data);
            if (data instanceof Array)
              commands = data;
          } catch (ex) {
            this.cx.stdout.write('Error loading: ' + this.path);
          }
          return Promise.resolve(commands);
        }.bind(this)
      ).catch(
        function(err) {
          // If the file does not exist return empty list
          return Promise.resolve(commands);
        }.bind(this)
      );
    };

    /**
     * @return {!Promise<null>}
    */
    Washrc.prototype.write = function(commands) {
      return new Promise(function(resolve, reject) {
        return this.cx.fileSystemManager.writeFile(
          new Path(this.path),
          DataType.UTF8String,
          JSON.stringify(commands, null, ' ') + '\n'
        ).then(
          function() {
            return resolve(null);
          }
        ).catch(
          function(error) {
            return reject(new AxiomError.Runtime(error));
          }
        );
      }.bind(this));
    };

    /**
     * @return {!Promise<null>}
     */
    Washrc.prototype.append = function(command) {
      return this.read().then(function(commands) {
        commands.push(command);
        return this.write(commands);
      }.bind(this));
    };

    /**
     * Executes the contents of washrc.
     *
     * @return {!Promise<null>}
     */
    Washrc.prototype.execute = function(wash) {
      return this.read().then(function(commands) {
        var execNext = function() {

          if (!commands.length) {
            return;
          }

          var command = commands.shift();
          var name = Object.keys(command)[0];
          return washUtil.findExecutable(wash.executeContext, name).then(
            function(result) {
              return wash.executeContext.call(result.path, command[name]).then(
                  function() {
                return execNext();
              });
            });
        };
        return execNext();
      });
    };
  }
);

//# sourceMappingURL=washrc.js.map