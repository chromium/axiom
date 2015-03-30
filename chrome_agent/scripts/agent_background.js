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
 * 
 */
var handleRequest_ = function(request, sendResponse) {
  console.log("Handling request:", JSON.stringify(request));

  var promise;
  if (request.type === 'call_api') {
    promise = callApi_(request.api, request.args);
  } else if (request.type === 'execute_code_in_tab') {
    promise = executeCodeInTab_(request.tabId, request.code);
  }
  promise.then(function(result) {
    sendResponse({success: true, result: result});
  }).catch(function(error) {
    sendResponse({success: false, error: error.message});
  });
};

/**
 * 
 */
var callApi_ = function(apiName, args) {
  var apiParts = apiName.split('.');

  if (apiParts[0] !== 'chrome')
    return Promise.reject('Only chrome.* APIs are supported');
  
  var api = chrome;
  // NOTE: Skip apiParts[0], which is 'chrome'.
  for (var i = 1; i < apiParts.length; ++i) {
    api = api[apiParts[i]];  
  }

  return new Promise(function(resolve, reject) {
    api.call(api, args, function(result) {
      resolve(result);
    });
  });
};

/**
 *
 */
var executeCodeInTab_ = function(tabId, code, opt_allFramse, opt_runAt) {
  return new Promise(function(resolve, reject) {
    var details = {
      code: code,
      allFrames: opt_allFrames || false,
      runAt: opt_runAt || 'document_end'
    };
    chrome.tabs.executeScript(tabId, details, function(resultAry) {
      resolve(resultAry);
    });
  });
};

/**
 * This is sent by our companion content script injected into a browser tab.
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('Message: ', request, sender);
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
    console.log('External message: ', request, sender);
    handleRequest_(request, sendResponse);
    // Indicates that the response is sent asynchronously.
    return true;
  }
);
