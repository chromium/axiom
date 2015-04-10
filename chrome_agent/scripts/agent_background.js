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

/**
 * Route a request to an appropriate worker function, wait for it to return
 * a result, then asynchronously send it in a response.
 * 
 * @private
 * @param {!Object<string, *>} request
 * @param {function(*): void} sendResponse
 * @return {void}
 */
var handleRequest_ = function(request, sendResponse) {
  var promise =
      request.type === 'call_api' ?
          callApi_(resolveApi_(request.api), request.args, request.options) :
      request.type === 'execute_script' ?
          executeScriptInTabs_(request.tabIds, request.code, request.options) :
      request.type === 'insert_css' ?
          insertCssIntoTabs_(request.tabIds, request.css, request.options) :
          Promise.reject('Unrecognized request type "' + request.type + '"');

  promise.then(function(result) {
    sendResponse({success: true, result: result});
  }).catch(function(error) {
    sendResponse({success: false, error: error.message ? error.message : error});
  });
};

/**
 * Resolve an API name to a corresponding API object, if any. This is generic,
 * i.e. not restricted to just the Chrome APIs. 
 * 
 * @private
 * @param {!string} apiName
 * @return {?Object} Resolved API object or null.
 */
var resolveApi_ = function(apiName) {
  var nameParts = apiName.split('.');
  var resolvedApi = window;
  for (var i = 0; i < nameParts.length; ++i) {
    resolvedApi = resolvedApi[nameParts[i]];
    if (!resolvedApi)
      return null;
  }
  return resolvedApi;
};

/**
 * A regexp for one particularly frequent error message that needs to be
 * translated for the client.
 * 
 * @private @const
 */
var BAD_API_INVOCATION_ERROR_RE_ =
    /^Error: Invocation of form (.+) doesn't match definition (.+)$/;

/**
 * Invoke a Chrome API with the given name and arguments, and return the result
 * If the API's name resolves to something different from a function, and there
 * no arguments, the value of the resolved object is returned instead.
 * 
 * @private
 * @param {Object} api
 * @param {!Object<string, *>} args
 * @param {{timeout: number}} options
 * @return {!Promise<*>} Result of the API call.
 */
var callApi_ = function(api, args, options) {
  return new Promise(function(resolve, reject) {
    if (!api) {
      return reject('No such API, or no permission to use it');
    }

    if (typeof api !== 'function') {
      // This can be an API property that the caller wants to read.
      if (args.length > 0) {
        return reject('This API is not a function: use with no arguments');
      }
      return resolve(api);
    }

    // Complete the promise either via a callback or a timeout.
    var timedOut = false;
    var timeout = null;
    if (options.timeout) {
      timeout = setTimeout(function() {
        timedOut = true;
        reject('Timed out');
      }, options.timeout);
    }

    var callback = function(result) {
      if (!timedOut) {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      }
    };

    try {
      // `args` is an array, so we must use `apply` to invoke the API. The API,
      // however, requires a callback as one extra argument: append it to `args`.
      // NOTE: Since the callback of this call will resolve/reject the outer
      // Promise, make sure the following is the last call of this function.
      api.apply(null, args.concat([callback]));
    } catch (error) {
      if (!timedOut) {
        clearTimeout(timeout);
        var match = BAD_API_INVOCATION_ERROR_RE_.exec(error);
        if (match) {
          // Massage this particularly frequent error message to be clearer.
          reject(
              'Wrong API arguments: expected ' + match[2] +
              ' but got ' + match[1] + ' <= ' + JSON.stringify(args));
        } else {
          reject(error);
        }
      }
    }
  });
};

/**
 * Execute a script in the given tab's "isolated world" (with full access to
 * the DOM context but not the JavaScript context).
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
 * @private
 * @param {!number} tabId
 * @param {!string} code
 * @param {{allFrames: boolean, runAt: string, timeout: number}} options
 * @return {!Promise<*>}
 */
var executeScriptInTab_ = function(tabId, code, options) {
  // TODO(ussuri): Catch and return possible exceptions in the user's code.
  // The following didn't work:
  // code = 'try {' + code + '} catch (err) { console.log("CAUGHT"); err; }';
  var details = {
    code: code,
    allFrames: options.allFrames || false,
    runAt: options.runAt || 'document_idle'
  };

  return callApi_(chrome.tabs.executeScript, [tabId, details], options)
    .then(function(result) {
      return details.allFrames ? result: result[0];
    });
};

/**
 * Execute a script in the given tabs' "isolated world" (with full access to
 * the DOM context but not the JavaScript context).
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
 * @private
 * @param {!(Array<number>|string)} tabIds
 * @param {!string} code
 * @param {{allFrames: boolean, runAt: string, timeout: number}} options
 * @return {!Promise<Object<string, *>>}
 */
var executeScriptInTabs_ = function(tabIds, code, options) {
  return applyActionToTabs_(tabIds, executeScriptInTab_, [code, options]);
};

/**
 * Insert a fragment of CSS into the given tab and return the result of the
 * underlying API call (mostly useful in case of errors).
 *
 * @private
 * @param {!number} tabId
 * @param {!string} css
 * @param {{allFrames: boolean, runAt: string, timeout: number}} options
 * @return {!Promise<*>}
 */
var insertCssIntoTab_ = function(tabId, css, options) {
  var details = {
    code: css,
    allFrames: options.allFrames || false,
    runAt: options.runAt || 'document_idle'
  };
  return callApi_(chrome.tabs.insertCSS, [tabId, details], options);
};

/**
 * Insert the given CSS fragment into the given list of tabs, with the given
 * options. If there are any errors, they are returned as a single string for
 * a single requested tab, or as a map of form { tabId1: error1, ... } for
 * multiple requested tabs (special values 'all' and 'window' are considered
 * multiple tabs even if they resolve to just one).
 * 
 * Note that the author styles take precedence over any iserted styles, so
 * if there is a clash for some setting, the inserted CSS will have no effect
 * (this is the limitation of the underlying Chrome API).
 *
 * @private
 * @param {!(Array<number>|string)} tabIds
 * @param {!string} css
 * @param {{allFrames: boolean, runAt: string, timeout: number}} options
 * @return {!Promise<Object<string, *>>}
 */
var insertCssIntoTabs_ = function(tabIds, css, options) {
  return applyActionToTabs_(tabIds, insertCssIntoTab_, [css, options]);
};

/**
 * Apply an action (a function-like entity) to the multiple requested tabs, and
 * return a map of form {tabId1: result1, ...}. Per-tab errors are reported as
 * strings with special values in the same map, but not flagged to the caller
 * in a more explicit way; that is, a call will always "succeed" from the
 * caller's perspective.
 *
 * @private
 * @param {!(Array<number>|string)} tabIds
 * @param {!function(!number, !string, {allFrames: boolean, runAt: string, timeout: number})} action
 * @param {!Array<*>} args
 * @return {!Promise<Object<string, *>>}
 */
var applyActionToTabs_ = function(tabIds, action, args) {
  // TODO(ussuri): Somehow return mixed results/errors, while explicitly
  // indicating to callers that error(s) have occurred.
  return normalizeTabIds_(tabIds).then(function(nTabIds) {
    var results = {};

    var applyAction = function(tabId) {
      return action.apply(null, [tabId].concat(args))
        .then(function(result) {
          results[tabId] = result;
        }).catch(function(error) {
          results[tabId] =
              '<ERROR: ' + (error.message ? error.message : error) + '>';
        });
    };

    var promises = nTabIds.map(function(tabId) {
      return applyAction(tabId);
    });
    return Promise.all(promises).then(function(_) {
      return results;
    });
  });
};

/**
 * Expand special values 'all' and 'window' of a tab ID list into an actual list
 * of IDs. Regular lists are returned as-is.
 *
 * @private
 * @param {!(Array<number>|string)} tabIds
 * @return {!Promise<!Array<number>>}
 */
var normalizeTabIds_ = function(tabIds) {
  if (!tabIds || tabIds === 'all') {
    return getAllTabIds_(false);
  } else if (tabIds === 'window') {
    return getAllTabIds_(true);
  } else {
    return /**@type {?}*/(Promise.resolve(tabIds));
  }
};

/**
 * Return a list of all tab IDs in all the open windows or the current
 * window only.
 *
 * @private
 * @param {boolean} thisWindowOnly
 * @return {!Promise<!Array<number>>} IDs of all the open tabs in all the windows.
 */
var getAllTabIds_ = function(thisWindowOnly) {
  return new Promise(function(resolve, reject) {
    // NOTE: {thisWindowOnly: false} means "other windows", but we want "all",
    // so use {}.
    var options = thisWindowOnly ? {currentWindow: true} : {};
    chrome.tabs.query(options, function(tabs) {
      resolve(tabs.map(function(tab) { return tab.id; }));
    });
  });
};

/**
 * This is the API end-point to listen to service requests from external clients.
 */
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    // TODO(ussuri): Verify the sender.
    handleRequest_(request, sendResponse);
    // Indicates that the response is sent asynchronously.
    return true;
  }
);

/**
 * @private @const
 */
var WEB_SHELL_TAB_PROPS_ = {
  title: 'Console',
  url: '*://*/**/web_shell/index.html'
};

/**
 * @private @const
 */
var HOSTED_WEB_SHELL_URL_ =
    'https://chromium.github.io/axiom/web_shell/index.html';

/**
 * @private
 * @type {number}
 */
var activeWebShellTabIdx_ = -1;

/**
 * Clicking on the extension icon in the toolbar will:
 * - If no tabs with the web shell are open, open a hosted shell in a new tab;
 * - If one or more tabs with the web shell are already open (e.g. a test
 *   and a hosted instances), then cycle through them.
 */
chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.query(WEB_SHELL_TAB_PROPS_, function(tabs) {
    if (tabs && tabs.length > 0) {
      ++activeWebShellTabIdx_;
      if (activeWebShellTabIdx_ >= tabs.length) {
        activeWebShellTabIdx_ = 0;
      }
      var tab = /** chrome.tabs.Tab */tabs[activeWebShellTabIdx_];
      chrome.tabs.update(tab.id, {active: true}, function() {});
      chrome.windows.update(tab.windowId, {focused: true}, function() {});
    } else {
      chrome.tabs.create({url: HOSTED_WEB_SHELL_URL_, active: true});
    }
  });
});
