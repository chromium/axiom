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
 * @param {!Object<string, *>} request
 * @param {function(*)} sendResponse
 * @return {void}
 */
var handleRequest_ = function(request, sendResponse) {
  console.log("Handling request:", JSON.stringify(request));

  var promise;
  if (request.type === 'call_api') {
    promise = callApi_(resolveApi_(request.api), request.args);
  } else if (request.type === 'execute_code') {
    promise = executeScriptInTabs_(request.tabIds, request.code);
  } else if (request.type === 'insert_css') {
    promise = insertCssIntoTabs_(request.tabIds, request.css);
  }

  promise.then(function(result) {
    sendResponse({success: true, result: result});
  }).catch(function(error) {
    sendResponse({success: false, error: error.message ? error.message : error});
  });
};

/**
 * @param {!string} apiName
 * @return {Object} Resolved API object or null.
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

var BAD_API_INVOCATION_ERROR_RE_ = 
    /^Error: Invocation of form (.+) doesn't match definition (.+)$/;

/**
 * @param {Object} api
 * @param {!Object<string, *>} args
 * @return {!Promise<*>} Result of the API call.
 */
var callApi_ = function(api, args) {
  return new Promise(function(resolve, reject) {
    if (!api)
      return reject('No such API');

    var callback = function(result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    };

    // `args` is an array, so we must use `apply` to invoke the API. The API,
    // however, requires a callback as one extra argument: append it to `args`.
    var argv = args;
    argv.push(callback);

    try {
      // NOTE: Since the callback of this call will resolve/reject the outer
      // Promise, make sure this is the last call in the outer function.
      api.apply(null, argv);
    } catch (error) {
      var match = BAD_API_INVOCATION_ERROR_RE_.exec(error);
      if (match) {
        // Massage this particularly frequent error message to be clearer.
        reject('Wrong API arguments: got ' + match[1] + ', need ' + match[2]);
      } else {
        reject(error);
      }
    }
  });
};

/**
 * @param {!number} tabId
 * @param {!string} code
 * @param {boolean=} opt_allFrames
 * @param {string=} opt_runAt
 * @return {!Promise<*>}
 */
var executeScriptInTab_ = function(tabId, code, opt_allFrames, opt_runAt) {
  // TODO(ussuri): Catch and return possible exceptions in the user's code.
  // The following didn't work:
  // code = 'try {' + code + '} catch (err) { console.log("CAUGHT"); err; }';
  var details = {
    code: code,
    allFrames: opt_allFrames || false,
    runAt: opt_runAt || 'document_idle'
  };
  return callApi_(chrome.tabs.executeScript, [tabId, details])
      .then(function(result) {
        return Promise.resolve(result.length === 1 ? result[0] : result);
      });
};

/**
 * @param {!(Array<number>|string)} tabIds
 * @param {!string} code
 * @param {boolean=} opt_allFrames
 * @param {string=} opt_runAt
 * @return {!Promise<*>}
 */
var executeScriptInTabs_ = function(tabIds, code, opt_allFrames, opt_runAt) {
  return applyActionToTabs_(
      tabIds, executeScriptInTab_, [code, opt_allFrames, opt_runAt]);
};

/**
 * @param {!number} tabId
 * @param {!string} css
 * @param {boolean=} opt_allFrames
 * @param {string=} opt_runAt
 * @return {!Promise<*>}
 */
var insertCssIntoTab_ = function(tabId, css, opt_allFrames, opt_runAt) {
  var details = {
    code: css,
    allFrames: opt_allFrames || false,
    runAt: opt_runAt || 'document_idle'
  };
  return callApi_(chrome.tabs.insertCSS, [tabId, details]);
};

/**
 * @param {!(Array<number>|string)} tabIds
 * @param {!string} css
 * @param {boolean=} opt_allFrames
 * @param {string=} opt_runAt
 * @return {!Promise<*>}
 */
var insertCssIntoTabs_ = function(tabIds, css, opt_allFrames, opt_runAt) {
  return applyActionToTabs_(
      tabIds, insertCssIntoTab_, [css, opt_allFrames, opt_runAt]);
};

/**
 * @param {!(Array<number>|string)} tabIds
 * @param {!function(!number, !string, boolean=, string=)} action
 * @param {!Array<*>} args
 * @return {!Promise<*>}
 */
var applyActionToTabs_ = function(tabIds, action, args) {
  return normalizeTabIds_(tabIds).then(function(nTabIds) {
    var applyAction = function(tabId) {
      return action.apply(null, [tabId].concat(args));
    };

    var errorHandler = function(error) { 
      errors = true;
      return Promise.resolve('ERROR: ' + error.message); 
    };
    
    // For a single tab, return a single result or a possible error.  
    if (nTabIds.length === 1) {
      return applyAction(nTabIds[0]);
    }

    // For multiple tabs, return a map of tabId -> result, with errors being
    // reported as strings, but not flagged to the caller; that is, a multi-tab
    // call will always "succeed" from the caller's perspective.
    // TODO(ussuri): Find a way to return mixed results/errors, while indicating
    // to callers that error(s) have occurred.
    var promises = [];
    var errors = false;

    for (var i = 0; i < nTabIds.length; ++i) {
      var promise = applyAction(nTabIds[i]).catch(errorHandler);
      promises.push(promise);
    }
    
    return Promise.all(promises).then(function(results) {
      var resultsMap = {};
      for (var i = 0; i < nTabIds.length; ++i) {
        resultsMap[+nTabIds[i]] = results[i];
      }
      return Promise.resolve(resultsMap);
    });
  });
};

/**
 * @param {!(Array<number>|string)} tabIds
 * @return {!Promise<number>}
 */
var normalizeTabIds_ = function(tabIds) {
  if (!tabIds || tabIds === 'all') {
    return getAllTabIds_();
  } else {
    return Promise.resolve(tabIds);
  }
};

/**
 * @return {!Promise<number>} IDs of all the open tabs in all the windows.
 */
var getAllTabIds_ = function() {
  return new Promise(function(resolve, reject) {
    chrome.tabs.query({}, function(tabs) {
      resolve(tabs.map(function(tab) { return tab.id; }));
    });
  });
};

/**
 * This is sent by our companion content script injected into a browser tab.
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    handleRequest_(request, sendResponse);
    // Indicate that the response is sent asynchronously.
    return true;
  }
);

/**
 * This is sent by a client to request some service from us.
 */
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    // TODO(ussuri): Verify the sender.
    handleRequest_(request, sendResponse);
    // Indicates that the response is sent asynchronously.
    return true;
  }
);

var WEB_SHELL_TAB_PROPS_ = {
  title: 'Console',
  url: '*://*/**/web_shell/index.html'
};
var HOSTED_WEB_SHELL_URL_ =
    'http://chromium.github.io/axiom/web_shell/index.html';
var activeWebShellTabIdx_ = -1;

/**
 * Clicking on the extension icon in the toolbar will:
 * - If no tabs with web shell are open, open a hosted shell in a new tab;
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
      var tab = tabs[activeWebShellTabIdx_];
      lastFocusedWebShellTabUrl_ = tab.url;
      chrome.tabs.update(tab.id, {active: true}, function() {});
      chrome.windows.update(tab.windowId, {focused: true}, function() {});
    } else {
      chrome.tabs.create({url: HOSTED_WEB_SHELL_URL_, active: true});
    }
  });
});
