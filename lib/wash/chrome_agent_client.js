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
 */
chromeAgentClient.executeCodeInTab = function(tabId, code) {
  return chromeAgentClient.sendRequest_(
    {
      type: 'execute_code',
      tabId: tabId,
      code: code
    }
  );
};

/**
 */
chromeAgentClient.sendRequest_ = function(request) {
  var completer = new Completer();

  chrome.runtime.sendMessage(
    chromeAgentClient.AGENT_APP_ID_,
    request,
    {}, // options
    function(response) {
      if (typeof response === 'undefined') {
        completer.reject(new AxiomError.Runtime('Chrome Agent not installed'));
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
