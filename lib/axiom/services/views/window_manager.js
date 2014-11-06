// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

/**
 * Registry of opened windows.
 */
export var WindowManager = function() {
  this.windows_ = {};
  this.extensionBindings_ = [];
};

export default WindowManager;

WindowManager.prototype.bind = function(serviceBinding) {
  serviceBinding.bind(this, {
    'onExtend': this.onExtend,
    'openWindow': this.openWindow,
});

  serviceBinding.ready();
};

/**
 * Extensions are responsible for creating windows. This enables
 * embedders of Axiom to control what type of window to create.
 * By convention, the embedders must import the "axiom-view.html"
 * so that axiom custom elements are available in the DOM.
 *
 * NOTE(rginda): Maybe extensions represent new window types?  We bake in html
 * windows, but an extension could provide chrome app windows?
 */
WindowManager.prototype.onExtend = function(extensionBinding) {
  this.extensionBindings_.push(extensionBinding);
};

WindowManager.prototype.openWindow = function(id) {
  var result = Promise
    .all(this.extensionBindings_.map(function(binding) {
      binding.whenLoadedAndReady().then(
        function() {
          return binding.createWindow(id); 
        }
      )}))
    .then(function(values) {
      var result = values.filter(function(x) { return !!x; });
      if (result.length === 0) {
        return Promise.reject(AxiomError.NotFound('window', id));
      } else if (result.length > 1) {
        return Promise.reject(AxiomError.Duplicate('window', id));
      } else {
        return Promise.resolve(result[0]);
      }
    })
    .then(function(window) {
      this.windows_[id] = window;
      var document = window.document;
      var frame = document.createElement('axiom-frame');
      frame.setAttribute('fit', '');
      document.body.appendChild(frame);
    });
};
