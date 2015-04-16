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

export var chromeAgentClient = {};
export default chromeAgentClient;

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
