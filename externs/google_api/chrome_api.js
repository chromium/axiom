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

/**
 * @fileoverview Externs for Google APIs (a minimal subset required by this app)
 *
 * @see Examples in https://developers.google.com/drive/v2/reference/
 *
 * @externs
 */

/**
 * @const
 */
chrome.runtime = {
  /**
   * @param {!string} id
   * @param {!Object<string, *>} request
   * @param {!Object<string, *>} options
   * @param {!function({success, error, result})} callback
   */
  sendMessage: function(id, request, options, callback) {},
  
  onMessage: {
    addListener: function(listener) {}
  },
  
  onMessageExternal: {
    addListener: function(listener) {}
  }
};

/**
 * @const
 */
chrome.tabs = {
  executeScript: function(id, script, callback) {},
  insertCSS: function(id, css, callback) {},
  query: function(options, callback) {},
  create: function(options) {},
  update: function(id, options, callback) {},
  Tab: {
    windowId: 0
  }
};

/**
 * @const
 */
chrome.windows = {
  update: function(id, options, callback) {}
};

/**
 * @const
 */
chrome.browserAction = {
  onClicked: {
    addListener: function(listener) {}
  }
};
