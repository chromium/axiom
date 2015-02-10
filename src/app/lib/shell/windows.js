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

import AxiomError from 'axiom/core/error';

/** @typedef ModuleManager$$module$axiom$core$module_manager */
var ModuleManager;

// For jshint...
/* global chrome */

/**
 * @constructor
 * 
 * @param {ModuleManager} moduleManager
 */
var ShellWindows = function(moduleManager) {
  this.moduleManager_ = moduleManager;
  this.extensionBinding_ = null;
};

export {ShellWindows};
export default ShellWindows;

ShellWindows.prototype.bind = function(extensionBinding) {
  this.extensionBinding_ = extensionBinding;
  this.extensionBinding_.bind(this, {'createWindow': this.createWindow});
  this.extensionBinding_.ready();
};

ShellWindows.prototype.createWindow = function(id) {
  if (id !== 'main-window') {
    return Promise.reject(new AxiomError.NotFound('window', [id]));
  }

  if (chrome && chrome.app && chrome.app.window)
    return this.createChromeAppWindow(id);
  else
    return this.createWebAppWindow(id);
};

/**
 * @param {string} id
 */
ShellWindows.prototype.createChromeAppWindow = function(id) {
  return new Promise(function(resolve, reject) {
    var appWindow = chrome.app.window.get(id);
    if (appWindow) {
      resolve(appWindow.contentWindow);
      return;
    }

    chrome.app.window.create(
      'html/' + id.replace(/-/g, '_') + '.html',
      {
        // TODO(ericarnold): Is there a better way to do this?
        // See https://code.google.com/p/closure-compiler/issues/detail?id=1179
        bounds: { height: 600, left: undefined, top: undefined, width: 800 }
      },
      function(appWindow) {
        if (chrome.runtime.lastError) {
          var message = chrome.runtime.lastError.message ?
              chrome.runtime.lastError.message : 'unknown';
          reject(new AxiomError.Runtime(message));
          return;
        }
        if (!appWindow) {
          reject(new AxiomError.Runtime('Error creating window "' + id +
                                    '" (invalid url?)'));
          return;
        }
        resolve(appWindow.contentWindow);
      }
    );
  });
};

ShellWindows.prototype.createWebAppWindow = function(id) {
  return new Promise(function(resolve, reject) {
    // Return the current window, as we only support one window for now.
    resolve(window);
  });
};
