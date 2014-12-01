// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

/**
 * Registry of opened windows.
 */
export var WindowManager = function() {
  this.windows_ = new Map();
  this.extensionBindings_ = [];
};

export default WindowManager;

/**
 * @param {ServiceBinding} serviceBinding
 */
WindowManager.prototype.bind = function(serviceBinding) {
  serviceBinding.bind(this, {
    'onExtend': 'onExtend',
    'openWindow': 'openWindow',
  });

  serviceBinding.ready();
};

/**
 * Extensions are responsible for creating windows. This enables
 * embedders of Axiom to control what type of window to create.
 * By convention, the embedders must import "axiom_vulcanized.html"
 * so that axiom custom elements are available in the DOM.
 *
 * @param {ExtensionBinding} extensionBinding
 */
WindowManager.prototype.onExtend = function(extensionBinding) {
  this.extensionBindings_.push(extensionBinding);
};

/*
 * @param {Document} document
 */
WindowManager.prototype.createRootFrame = function(document) {
  var frame = document.createElement('axiom-frame');
  frame.setAttribute('fit', '');
  frame.setWindowManager(this);
  document.body.appendChild(frame);
};

/*
 * @param {string} id  The window identifier
 */
WindowManager.prototype.openWindow = function(id) {
  return Promise.all(this.extensionBindings_.map(function(binding) {
    return binding.whenLoadedAndReady().then(
      function() {
        return binding.createWindow(id);
      }
    );
  })).then(function(values) {
    var result = values.filter(function(x) { return !!x; });
    if (result.length === 0)
      return Promise.reject(AxiomError.NotFound('window', id));
    if (result.length > 1)
      return Promise.reject(AxiomError.Duplicate('window', id));
    return Promise.resolve(result[0]);
  }).then(function(window) {
    this.windows_.set(id, window);
    return window;
  }.bind(this));
};
