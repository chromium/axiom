// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
    'onExtend': this.onExtend
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
WindowManager.prototype.onExtend = function(extension) {
  this.extensionBindings_.push(extensionBinding);
  var defineWindows = extensionBinding.descriptor['define-windows'];
  for (var id in defineWindows) {
    this.windows_[id] = {
      descriptor: defineWindows[id],
      extensionBinding: extensionBinding
    };
  }
};
