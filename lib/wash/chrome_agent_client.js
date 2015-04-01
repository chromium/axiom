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

export var chromeAgentClient = {};
export default chromeAgentClient;

chromeAgentClient.AGENT_APP_ID_ = 'lfbhahfblgmngkkgbgbccedhhnkkhknb';
chromeAgentClient.AGENT_INSTALL_URL_ =
    'https://chrome.google.com/webstore/detail/' +
    chromeAgentClient.AGENT_APP_ID_;

/**
 */
chromeAgentClient.installAgent = function() {
  window.open(chromeAgentClient.AGENT_INSTALL_URL_);
};

/**
 * @param {string} api
 */
chromeAgentClient.openApiReference = function(api) {
  var url = 'https://developer.chrome.com/extensions/';
  if (api) {
    var match = /^chrome\.(\w+)(?:\.(\w+))?$/.exec(api);
    if (match && match[1]) {
      url += match[1];
      if (match[2]) {
        url += '#method-' + match[2];
      }
    }
  } else {
    url += 'api_index';
  }
  window.open(url);
};

/**
 */
chromeAgentClient.callApi = function(api, args) {
  return chromeAgentClient.sendRequest_(
    {
      type: 'call_api',
      api: api,
      args: args
    }
  );
};

/**
 * @type {Array<number>} tabIds
 * @type {string} code
 */
chromeAgentClient.executeCodeInTabs = function(tabIds, code) {
  return chromeAgentClient.sendRequest_(
    {
      type: 'execute_code',
      tabIds: tabIds,
      code: code
    }
  );
};

/**
 * @type {Array<number>} tabIds
 * @type {string} css
 */
chromeAgentClient.insertCssIntoTabs = function(tabIds, code) {
  return chromeAgentClient.sendRequest_(
    {
      type: 'insert_css',
      tabIds: tabIds,
      css: css
    }
  );
};

/**
 * @return {Promise<undefined>} Success/failure.
 */
chromeAgentClient.sendRequest_ = function(request) {
  return chromeAgentClient.maybeInstallAgent_()
      .then(function() {
    return chromeAgentClient.sendRequestImpl_(request);
  });
};

/**
 * @return {Promise<undefined>} Success/failure.
 */
chromeAgentClient.sendRequestImpl_ = function(request) {
  var completer = new Completer();

  chrome.runtime.sendMessage(
    chromeAgentClient.AGENT_APP_ID_,
    request,
    {}, // options
    function(response) {
      if (typeof response === 'undefined') {
        completer.reject(new AxiomError.Missing(
            'Chrome Agent is not installed'));
      } else if (!response.success) {
        completer.reject(new AxiomError.Runtime(
            'Chrome Agent error: ' + response.error));
      } else {
        completer.resolve(response.result);
      }
    }
  );

  return completer.promise;
};

/**
 * @return {Promise<undefined>} Success/failure.
 */
chromeAgentClient.maybeInstallAgent_ = function() {
  var completer = new Completer();

  var isChrome = !!navigator && /Chrome/.test(navigator.userAgent);
  if (!isChrome) {
    completer.reject(
        new AxiomError.Incompatible(
            'runtime environment', 'Supported under Chrome only'));
    return completer.promise;
  }

  // TODO(ussiri): Once owned URLs are registered with the Agent in CWS, use
  // chrome.app.isInstalled property here (?).
  var isAgentInstalled = document.getElementById('chrome-agent-is-installed');
  if (isAgentInstalled) {
    completer.resolve();
    return completer.promise;
  }

  var installDialog = document.getElementById('axiom_agent_install_dialog');

  if (!installDialog) {
    installDialog = document.createElement('dialog');
    installDialog.id = 'axiom_agent_install_dialog';
    installDialog.innerHTML =
        '<form method="dialog">' +
        '  <div>' +
        '    This action requires a companion Chrome extension. ' +
        '    After you click Ok, you will be taken to the inline install ' +
        '    dialog to complete or cancel the installation.' +
        '  </div>' +
        '  <menu>' +
        '    <button type="submit">Ok</button>' +
        '  </menu>' +
        '</form>';
    document.body.appendChild(installDialog);
  }

  installDialog.addEventListener('close', function() {
    chrome.webstore.install(
        chromeAgentClient.AGENT_INSTALL_URL_,
        function() {
          completer.resolve();
        },
        function(error, errorCode) {
          completer.reject(new AxiomError.Runtime(
              'Chrome Agent installation failed: ' + error));
        }
    );
  });

  installDialog.showModal();

  return completer.promise;
};
