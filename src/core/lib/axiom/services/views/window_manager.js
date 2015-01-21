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
