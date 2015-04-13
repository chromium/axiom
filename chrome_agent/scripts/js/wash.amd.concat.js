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
   * @return {void}
   */
  chromeAgentClient.installAgent = function() {
    window.open(chromeAgentClient.AGENT_INSTALL_URL_);
  };

  /**
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

define(
  "wash/exe/cat",
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
      if (!list.length || cx.getArg('help')) {
        cx.stdout.write([
          'usage: cat <file> ...',
          'Echo one or more files to stdout.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      var fileSystem = cx.fileSystemManager;
      var errors = false;

      var catNext = function() {
        if (!list.length) {
          return null;
        }

        /** @type {string} */
        var pathSpec = list.shift();
        /** @type {string} */
        var pwd = cx.getPwd();
        /** @type {Path} */
        var path = Path.abs(pwd, pathSpec);

        return fileSystem.readFile(path)
          .then(function(result) {
            cx.stdout.write(result.data + '\n');
            return catNext();
          })
          .catch(function(e) {
            errors = true;
            cx.stdout.write(
                'cat: ' + path.originalSpec + ': ' + e.toString() + '\n');
            return catNext();
          });
      };

      catNext().then(function() {
        if (errors) {
          cx.closeError(new AxiomError.Runtime('Some files could not be read'));
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

define(
  "wash/exe/chrome",
  ["axiom/core/error", "wash/chrome_agent_client", "exports"],
  function(axiom$core$error$$, wash$chrome_agent_client$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var chromeAgentClient;
    chromeAgentClient = wash$chrome_agent_client$$["default"];

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    var main = function(cx) {
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
      var script = cx.getArg('exec-script', false);
      var css = cx.getArg('insert-css', false);
      var argv = cx.getArg('_', []);

      // Allow exactly 1 of the mutually exclusive switches and verify the number
      // of free arguments.
      if (help ||
          (api + apiDoc + script + css + installAgent != 1) ||
          (api && argv.length < 1) ||
          (apiDoc && argv.length > 1) ||
          (script && argv.length < 2) ||
          (css && argv.length < 2) ||
          (installAgent && argv.length > 0)) {
        cx.stdout.write([
          'Usage:',
          '',
          'chrome -a|--call-api <API method> [<arg1>...] [-t|--timeout <ms>]',
          '  Executes a Chrome Extensions API call on the browser side and',
          '  returns the result.',
          '',
          'chrome -s|--exec-script <code> <tab_id1>...|all|window',
          '    [-t|--timeout <ms>] [--all-frames] [--run-at]',
          '  Executes a script in the top frame or all frames of the specified',
          '  tab(s), returning the results as a map of tabId => script result.',
          '',
          'chrome -c|--insert-css <css> <tab_id1>...|all|window',
          '    [-t|--timeout <ms>] [--all-frames] [--run-at]',
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
        return;
      }

      if (apiDoc) {
        chromeAgentClient.openApiOnlineDoc(argv[0]);
        cx.closeOk();
        return;
      }

      var options = {
        timeout: /** number */ cx.getArg('timeout', 1000),
        allFrames: /** boolean */ cx.getArg('all-frames', false),
        runAt: /** string */ cx.getArg('run-at', '')
      };

      var promise =
          api ?    callApi_(argv[0], argv.slice(1), options) :
          script ? executeScript_(argv[0], argv.slice(1), options) :
          css ?    insertCss_(argv[0], argv.slice(1), options) :
                   null;

      promise
        .then(function(result) {
          if (typeof result !== 'undefined') {
            if (typeof result === 'object')
              result = JSON.stringify(result, null, 2);
            cx.stdout.write(result + '\n');
          }
          cx.closeOk();
        }).catch(function(error) {
          if (error instanceof chromeAgentClient.ErrorSendingRequest) {
            cx.closeError(new AxiomError.Missing(
                'This command requires Chrome Agent extension to be installed. ' +
                'Rerun with the --install-agent switch to install ' +
                '(' + error.message + ')'));
          } else {
            cx.closeError(error);
          }
        });
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    main.signature = {
      'help|h': '?',
      'install-agent': '?',
      'api-doc|d': '?',
      'call-api|a': '?',
      'exec-script|s': '?',
      'insert-css|c': '?',
      'all-frames': '?',
      'run-at': '$',
      'timeout|t': '*',
      '_': '@'
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
     * @return {!Promise<*>}
     */
    var executeScript_ = function(code, tabIds, options) {
      return sanitizeTabIds_(tabIds)
        .then(function(sTabIds) {
          return chromeAgentClient.executeScriptInTabs(code, sTabIds, options)
            .then(function(/** !Object<string, *>*/tabResults) {
              return formatTabResults_(tabResults, isExplicitSingleTab_(tabIds));
            });
        });
    };

    /**
     * @param {!string} css
     * @param {!Array<number|string>} tabIds
     * @param {!{allFrames: boolean, runAt: string, timeout: number}} options
     * @return {!Promise<*>}
     */
    var insertCss_ = function(css, tabIds, options) {
      return sanitizeTabIds_(tabIds)
        .then(function(sTabIds) {
          return chromeAgentClient.insertCssIntoTabs(css, sTabIds, options)
            .then(function(/** !Object<string, *>*/tabResults) {
              return formatTabResults_(tabResults, isExplicitSingleTab_(tabIds));
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
          return Promise.reject(
              new AxiomError.TypeMismatch('tab IDs must be numbers', tabIds));
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
     * @param {boolean} omitTabIds
     * @return {*}
     */
    var formatTabResults_ = function(tabResults, omitTabIds) {
      if (omitTabIds) {
        var values = [];
        for (var id in tabResults)
          values.push(tabResults[id]);
        return values.length === 1 ? values[0] : values;
      }
      return tabResults;
    };
  }
);

//# sourceMappingURL=chrome.js.map
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
define("wash/exe/echo", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

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

    var list = cx.getArg('_');
    var value;

    if (list.length == 1 && cx.getArg('pluck', true)) {
      value = list[0];
    } else {
      value = list;
    }

    if (typeof value === 'object') {
      value = JSON.stringify(value, null, cx.getArg('space', '  '));
    }

    cx.stdout.write(value + '\n');

    cx.closeOk();
  };

  __es6_export__("main", main);
  __es6_export__("default", main);

  main.signature = {
    '_': '@',
    'help|h': '?',
    'pluck|p': '?',
    'space|s': '$'
  };
});

//# sourceMappingURL=echo.js.map
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
          'usage: import [<target-directory>] [-f|--file]',
          'Import a directory from the local file system.',
          '',
          'If <target-directory> is provided, the file(s) will be imported there.',
          'If not, they will be imported into the current directory.',
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

      /** @private @type {?boolean} Force import of single file*/
      this.singleFile_ = null;

      /** @type {Element} The originally focused element to restore. */
      this.originalFocusElement_ = null;

      /** @type {boolean} Files have been selected (remove cancel handler). */
      this.filesChosen_ = false;
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

      /** @type {Element} */
      var dummyFocusInput = document.createElement('input');
      dummyFocusInput.setAttribute('type', 'text');
      document.body.appendChild(dummyFocusInput);
      dummyFocusInput.focus();
      this.dummyFocusInput_ = dummyFocusInput;

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

      input.click();

      // Localize the handler so we can remove it later.
      this.handleFileCancel_ = this.handleFileCancel_.bind(this);

      // Cancellation is detected by creating a text field and giving it focus.
      // When the field gets focus again, and the `change` handler (above) hasn't
      // fired, we know that a cancel happened.
      dummyFocusInput.addEventListener('focus', this.handleFileCancel_, false);
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
        return this.fsm_.mkdir(path).catch(function (e) {
          if (AxiomError.Duplicate.test(e)) {
            return Promise.resolve();
          }
          return Promise.reject(e);
        });
      }.bind(this));
    };

    /**
     * Handle the cancelation of choosing a file / directory.
     *
     * @private
     * @param {Event} evt
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
      }.bind(this), 100);
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

      /** @type {FileList} */
      var files = evt.target.files;

      /** @type {!Array<Promise>} */
      var copyPromises = [];

      var onFileLoad = function(data, evt) {
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
          fileCompleter.resolve(null);
        }.bind(this)).catch(function(e) {
          fileCompleter.resolve(e);
        });
      };

      for (var i = 0; i < files.length; i++) {
        /** @type {!File} */
        var f = files[i];

        /** @type {string} */
        var relativePath =
            /** @type {!{webkitRelativePath: string}} */(f).webkitRelativePath

        if (relativePath === undefined || this.singleFile_) {
          relativePath = /** @type {{name: string}} */(f).name;
        }

        var path = Path.abs(this.destination.spec, relativePath);

        var reader = new FileReader();

        /** @type {Completer} */
        var fileCompleter = new Completer();

        /** @type {{path:Path, completer:Completer}} */
        var data = {
          path: path,
          completer: fileCompleter
        };

        reader.onload = onFileLoad.bind(this, data);

        copyPromises.push(fileCompleter.promise);

        reader.readAsBinaryString(f);
      }

      Promise.all(copyPromises).then(function (values) {
        this.destroy_();

        /** @type {Array<Error>} */
        var errors = values.filter(function(element) { return element !== null; });

        if (errors.length === 0) {
          this.cx_.closeOk();
        } else {
          this.cx_.closeError(new AxiomError.Unknown(errors));
        }
      }.bind(this));
    };

    /**
     * Cleanup after command finishes
     *
     * @private
     * @return {void}
     */
    ImportCommand.prototype.destroy_ = function() {
      document.body.removeChild(this.input_);
      document.body.removeChild(this.dummyFocusInput_);

      // TODO(umop): Fix focus issue
      // Return focus to the `activeElement` which is the iframe with `hterm` in it.
      // This causes the cursor to lose its focus style (hollow cursor instead of
      // block cursor), but does not actually cause the terminal to lose focus.
      this.originalFocusElement_.focus();
    }
  }
);

//# sourceMappingURL=import.js.map
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
      if (document.location.protocol !== 'http:') {
        cx.closeError(new AxiomError.Incompatible(
            'connection protocol', 'gdrive file system requires HTTPS connection'));
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

      if (cx.getArg('help')) {
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

      cx.call(cx.fileSystemManager, fsMountCmd, arg).then(function() {
        cx.closeOk();
      }).catch(function(err) {
        cx.closeError(err);
      });
    };

    main.signature = {
      'help|h': '?',
      'type|t': '$',
      'name|n': '$'
    };

    __es6_export__("default", main);
  }
);

//# sourceMappingURL=mount.js.map
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

define(
  "wash/exe/mount.stream",
  ["axiom/core/error", "axiom/fs/stream/stub_file_system", "axiom/fs/data_type", "axiom/fs/path", "axiom/fs/stream/channel", "axiom/fs/stream/transport", "axiom/fs/stream/web_socket_streams", "axiom/fs/stream/extension_streams", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$stream$stub_file_system$$,
    axiom$fs$data_type$$,
    axiom$fs$path$$,
    axiom$fs$stream$channel$$,
    axiom$fs$stream$transport$$,
    axiom$fs$stream$web_socket_streams$$,
    axiom$fs$stream$extension_streams$$,
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
    var ExtensionStreams;
    ExtensionStreams = axiom$fs$stream$extension_streams$$["default"];

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef ReadResult$$module$axiom$fs$read_result */
    var ReadResult;

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

          cx.stdio.stdout.write('Stream type: ' + streamType + '\n');
          cx.stdio.stdout.write('Stream src: ' + streamSrc + '\n');

          switch (streamType) {
            case 'websocket':
              var streams = new WebSocketStreams();
              return streams.open(streamSrc).then(function() {
                var transport = new Transport(
                    'websocket',
                    streams.readableStream,
                    streams.writableStream);
                var channel = new Channel('websocketchannel', transport);
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
                )
              });

              break;
            case 'extension':
              var streams = new ExtensionStreams();
              return streams.open(streamSrc).then(function() {
                // Open connection to extension
                var transport = new Transport(
                    'extension',
                    streams.readableStream,
                    streams.writableStream);

                var channel = new Channel('extensionchannel', transport);
                var fileSystem =
                    new StubFileSystem(fileSystemManager, name, channel);
                fileSystem.description =
                    'extfs - ' + streamType + ' - ' + streamSrc;

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
                )
              });
              break;
          }
          return Promise.reject(
              new AxiomError.Invalid('type', streamType));
        }
      )
    };
  }
);

//# sourceMappingURL=mount.stream.js.map
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
define("wash/exe/pwd", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

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

      this.print('%get-row-column()');

      // Hook up reading from stdin.
      this.executeContext.stdin.pause();
      this.executeContext.stdin.onReadable.addListener(this.readStdIn_, this);
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

define(
  "wash/exe/touch",
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
          return cx.open().then(function() {
            return touchNext();
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
          cx.closeError(new AxiomError.Runtime('Some files could not be created'));
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

define(
  "wash/exe/wash",
  ["axiom/core/error", "axiom/fs/arguments", "axiom/fs/data_type", "axiom/fs/base/file_system_manager", "axiom/fs/stream/memory_stream_buffer", "axiom/fs/nested_stdio", "axiom/fs/base/open_context", "axiom/fs/path", "axiom/fs/seek_whence", "axiom/fs/js/file_system", "axiom/fs/js/entry", "wash/parse", "wash/termcap", "wash/washrc", "wash/version", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$arguments$$,
    axiom$fs$data_type$$,
    axiom$fs$base$file_system_manager$$,
    axiom$fs$stream$memory_stream_buffer$$,
    axiom$fs$nested_stdio$$,
    axiom$fs$base$open_context$$,
    axiom$fs$path$$,
    axiom$fs$seek_whence$$,
    axiom$fs$js$file_system$$,
    axiom$fs$js$entry$$,
    wash$parse$$,
    wash$termcap$$,
    wash$washrc$$,
    wash$version$$,
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
    var MemoryStreamBuffer;
    MemoryStreamBuffer = axiom$fs$stream$memory_stream_buffer$$["default"];
    var NestedStdio;
    NestedStdio = axiom$fs$nested_stdio$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var SeekWhence;
    SeekWhence = axiom$fs$seek_whence$$["default"];
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

      this.executeContext.stdio.signal.onData.addListener(this.onSignal_, this);

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
     */
    Wash.prototype.loadFile = function(name) {
      if (!name) {
        return Promise.reject(new AxiomError.Invalid('name', name));
      }
      return this.fileSystemManager.readFile(
          new Path(name), DataType.UTF8String).then(
        function(/** ReadResult */ result) {
          try {
            if (typeof result.data != 'string') {
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
      var pwd = this.executeContext.getEnv('$PWD',
          this.executeContext.fileSystemManager.defaultFileSystem.rootPath.spec);
      return Path.abs(pwd, path);
    };

    /**
     * @return {void}
     */
    Wash.prototype.setPrompt = function() {
      this.promptString_ = this.tc_.output('%set-attr(FG_BOLD, FG_CYAN)' +
          this.executeContext.getEnv('$PWD') + '> %set-attr()');
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

        return this.findExecutable(pathSpec);
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
     * @param {string} pathSpec
     * @return {!Promise<!FindExecutableResult>}
     */
    Wash.prototype.findExecutable = function(pathSpec) {
      var rootPath = this.fileSystemManager.defaultFileSystem.rootPath;
      var searchList = this.executeContext.getEnv('@PATH', [rootPath.spec]);

      /** @type {function(): !Promise<!FindExecutableResult>} */
      var searchNextPath = function() {
        if (!searchList.length)
          return Promise.reject(new AxiomError.NotFound('path', pathSpec));

        var currentPrefix = searchList.shift();
        var currentPath = new Path(currentPrefix).combine(pathSpec);
        return this.fileSystemManager.stat(currentPath).then(
          function(statResult) {
            if (statResult.mode & Path.Mode.X) {
              return Promise.resolve({
                fileSystem: this.fileSystemManager,
                path: currentPath,
                statResult: statResult
              });
            }
            return searchNextPath();
          }.bind(this)
        ).catch(function(value) {
          if (AxiomError.NotFound.test(value))
            return searchNextPath();

          return Promise.reject(value);
        });
      }.bind(this);

      return searchNextPath();
    };

    /**
     * @return {!Promise<*>}
     */
    Wash.prototype.read = function() {
      return this.findExecutable('readline').then(
        function(result) {
          return this.executeContext.call(
              result.fileSystem,
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

      var ary = this.parseShellInput(str);
      return this.dispatch(ary[0], ary[1], ary[2], ary[3]).then(
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
     * Parse a line of shell input into the path and the argument string.
     *
     * @return {Array<string>}
     */
    Wash.prototype.parseShellInput = function(str) {
      var path, argv, redirMode, redirPath;

      var pos = str.indexOf('>');
      if (pos > -1) {
        if (str[pos + 1] === '>') {
          redirMode = 'wc';
          redirPath = str.substr(pos + 2).trim();
        } else {
          redirMode = 'wct';
          redirPath = str.substr(pos + 1).trim();
        }
        str = str.substr(0, pos);
      }

      pos = str.indexOf(' ');
      if (pos > -1) {
        path = str.substr(0, pos);
        argv = str.substr(pos + 1).trim();
      } else {
        path = str;
        argv = null;
      }

      if (path.substr(0, 2) == './') {
        /** @type {string} */
        var pwd = this.executeContext.getEnv('$PWD',
            this.executeContext.fileSystemManager.defaultFileSystem.rootPath.spec);
        path = pwd + '/' + path.substr(2);
      }

      if ((redirMode && !redirPath) ||
          (redirPath && redirPath.indexOf('>') !== -1)) {
        throw new AxiomError.Invalid('stdout-redirection', str);
      }

      return [path, argv, redirPath, redirMode];
    };

    /**
     * Run the given path with the given argv string, returning a promise that
     * resolves to the result of the evaluation.
     *
     * For relative paths we'll search the builtins as well as $PATH.  The argv
     * string will be parsed according to the sigil of the target executable.
     *
     * @param {string} pathSpec
     * @param {string} argv
     * @param {string} redirPathSpec
     * @param {string} redirMode
     * @return {!Promise<*>}
     */
    Wash.prototype.dispatch = function(pathSpec, argv, redirPathSpec, redirMode) {
      return this.findBuiltinOrExecutable(pathSpec).then(function(result) {
        var arg = this.parseArgv(result.statResult.signature, argv);

        var stdio = new NestedStdio(this.executeContext.stdio);
        var redirBuffer;

        var cxPromises = [
          result.fileSystem.createExecuteContext(result.path, stdio, arg)
        ];

        if (redirPathSpec) {
          redirBuffer = new MemoryStreamBuffer();
          stdio.stdout = redirBuffer.writableStream;
          cxPromises.push(
              this.fileSystemManager.createOpenContext(
                  this.absPath(redirPathSpec), redirMode));
        }

        return Promise.all(cxPromises).then(
          function(cxs) {
            var execCx = cxs[0];
            var redirCx = cxs[1];

            execCx.onClose.addListener(function(reason, value) {
              if (reason === 'ok') {
                if (typeof value !== 'undefined' && typeof value !== 'number' &&
                    value !== null) {
                  stdio.stdout.write(JSON.stringify(value, null, '  ') + '\n');
                }
              }

              stdio.close();
            });

            if (!!redirCx) {
              redirCx.open().then(function() {
                redirBuffer.onData.addListener(function(data) {
                  redirCx.write(0, SeekWhence.End, DataType.UTF8String, data);
                });
                redirBuffer.resume();
              });
            }
            return this.dispatchExecuteContext(execCx);
          }.bind(this));
      }.bind(this));
    };

    /**
     * @param {ExecuteContext} cx
     * @return {Promise<*>}
     */
    Wash.prototype.dispatchExecuteContext = function(cx) {
      this.executeContext.setCallee(cx);
      return cx.execute();
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

    /**
     * @param {!Signal} signal
     * @return {void}
     */
    Wash.prototype.onSignal_ = function(signal) {
      this.executeContext.dispatchSignal(signal);
    };
  }
);

//# sourceMappingURL=wash.js.map
// GENERATED BY grunt make_dir_module.
define(
  "wash/exe_modules",
  ["wash/exe/cat", "wash/exe/chrome", "wash/exe/clear", "wash/exe/cp", "wash/exe/echo", "wash/exe/import", "wash/exe/ls", "wash/exe/mkdir", "wash/exe/mkstream", "wash/exe/mount.gdrive", "wash/exe/mount", "wash/exe/mount.stream", "wash/exe/mv", "wash/exe/pwd", "wash/exe/readline", "wash/exe/rm", "wash/exe/touch", "wash/exe/wash", "exports"],
  function(
    wash$exe$cat$$,
    wash$exe$chrome$$,
    wash$exe$clear$$,
    wash$exe$cp$$,
    wash$exe$echo$$,
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
    wash$exe$touch$$,
    wash$exe$wash$$,
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
    m5 = wash$exe$import$$["default"];
    var m6;
    m6 = wash$exe$ls$$["default"];
    var m7;
    m7 = wash$exe$mkdir$$["default"];
    var m8;
    m8 = wash$exe$mkstream$$["default"];
    var m9;
    m9 = wash$exe$mount$gdrive$$["default"];
    var m10;
    m10 = wash$exe$mount$$["default"];
    var m11;
    m11 = wash$exe$mount$stream$$["default"];
    var m12;
    m12 = wash$exe$mv$$["default"];
    var m13;
    m13 = wash$exe$pwd$$["default"];
    var m14;
    m14 = wash$exe$readline$$["default"];
    var m15;
    m15 = wash$exe$rm$$["default"];
    var m16;
    m16 = wash$exe$touch$$["default"];
    var m17;
    m17 = wash$exe$wash$$["default"];
    var dir = {};
    __es6_export__("dir", dir);
    __es6_export__("default", dir);
    dir["cat"] = m0;
    dir["chrome"] = m1;
    dir["clear"] = m2;
    dir["cp"] = m3;
    dir["echo"] = m4;
    dir["import"] = m5;
    dir["ls"] = m6;
    dir["mkdir"] = m7;
    dir["mkstream"] = m8;
    dir["mount.gdrive"] = m9;
    dir["mount"] = m10;
    dir["mount.stream"] = m11;
    dir["mv"] = m12;
    dir["pwd"] = m13;
    dir["readline"] = m14;
    dir["rm"] = m15;
    dir["touch"] = m16;
    dir["wash"] = m17;
  }
);

//# sourceMappingURL=exe_modules.js.map
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
 * Left pad a string to a given length using a given character.
 *
 * @param {string} str The string to pad.
 * @param {number} length The desired length.
 * @param {string} opt_ch The optional padding character, defaults to ' '.
 * @return {string} The padded string.
 */
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
define("wash/termcap", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

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
// GENERATED BY grunt make_version_module.
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

define(
  "wash/washrc",
  ["axiom/fs/path", "axiom/core/error", "axiom/fs/data_type", "exports"],
  function(axiom$fs$path$$, axiom$core$error$$, axiom$fs$data_type$$, __exports__) {
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
            this.cx.stdout('Error loading: ' + this.path);
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
            }.bind(this)
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
          return wash.findExecutable(name).then(
            function(result) {
              return wash.executeContext.call(wash.fileSystemManager,
                 result.path, command[name]).then(function() {
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