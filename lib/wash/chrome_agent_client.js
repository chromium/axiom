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

export var chromeAgentClient = {};
export default chromeAgentClient;

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
          reject(new AxiomError.Runtime(
              'Chrome Agent error: ' + chrome.runtime.lastError.message));
        } else if (!response.success) {
          reject(new AxiomError.Runtime(
              'Chrome Agent error: ' + response.error));
        } else {
          resolve(response.result);
        }
      }
    );
  });
};
