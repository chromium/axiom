// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

// For jshint...
/* global chrome */

export var ShellWindows = function(moduleManager) {
  this.moduleManager_ = moduleManager;
  this.extensionBinding_ = null;
};

export default ShellWindows;

ShellWindows.prototype.bind = function(extensionBinding) {
  this.extensionBinding_ = extensionBinding;
  this.extensionBinding_.bind(this, {'createWindow': this.createWindow});
  this.extensionBinding_.ready();
};

ShellWindows.prototype.createWindow = function(id) {
  if (id !== 'main-window')
    return Promise.reject(AxiomError.NotFound('window', [id]));

  if (chrome && chrome.app && chrome.app.window)
    return this.createChromeAppWindow(id);
  else
    return this.createWebAppWindow(id);
};

ShellWindows.prototype.createChromeAppWindow = function(id) {
  return new Promise(function(resolve, reject) {
    chrome.app.window.create(
      'html/' + id.replace(/-/g, '_') + '.html',
      {
        id: id,
        bounds: { width: 800, height: 600 }
      },
      function(appWindow) {
        if (chrome.runtime.lastError) {
          reject(AxiomError.Runtime(chrome.runtime.lastError.message));
          return;
        }
        if (!appWindow) {
          reject(AxiomError.Runtime('Error creating window "' + id + '" (invalid url?)'));
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
