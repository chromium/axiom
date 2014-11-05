// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

/**
 * Registry of views that can be placed in windows.
 */
export var ViewManager = function() {
  this.views_ = {};
  this.extensionBindings_ = [];
};

export default ViewManager;

ViewManager.prototype.bind = function(serviceBinding) {
  serviceBinding.bind(this, {
    'onExtend': this.onExtend,
    'register': this.register,
    'unregister': this.unregister,
  });

  serviceBinding.ready();
};

/**
 * Extending the View Manager adds new view types.
 *
 * The extension descriptor should provide a unique id for each view.  The
 * binding should provide 'show' and 'hide' callbacks.
 */
ViewManager.prototype.onExtend = function(extensionBinding) {
  this.extensionBindings_.push(extensionBinding);
  var defineViews = extensionBinding.descriptor['define-views'];
  for (var id in defineViews) {
    this.views_[id] = {
      descriptor: defineViews[id],
      extensionBinding: extensionBinding
    };
  }
};

/**
 * Register a view given a unique id and a custom element.
 */
ViewManager.prototype.register = function(id, tagName) {
  var view = this.views_[id];
  if (!view)
    return Promise.reject(AxiomError.NotFound('view', name));

  /*
  var binding = command.extensionBinding;
  return binding.whenLoadedAndReady().then(
      function() { binding.call(name, arg) });
  */
};

/**
 * Unregister a view given its id.
 */
ViewManager.prototype.unregister = function(id) {
  var view = this.views_[id];
  if (!view)
    return Promise.reject(AxiomError.NotFound('view', name));

  // ???
};
