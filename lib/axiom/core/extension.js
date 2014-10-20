// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomEvent from 'axiom/core/event';
import ExtensionBinding from 'axiom/bindings/extension';

/**
 * An extension to a service.
 *
 * @param {Module} sourceModule The module providing the extension.
 * @param {Service} targetService The service being extended.
 * @param {Object} descriptor A descriptor for the extension.
 */
export var Extension = function(sourceModule, targetService, descriptor) {
  this.service = targetService;
  this.module = sourceModule;
  this.descriptor = descriptor;

  this.Binding = function() {
    ExtensionBinding.call(this,
                          sourceModule.moduleId,
                          targetService.serviceId,
                          targetService.descriptor['extension-binding']);
  };

  this.Binding.prototype = Object.create(ExtensionBinding.prototype);

  this.binding = new this.Binding();
  this.binding.onLoadRequest.addListener(this.onLoadRequest_, this);
};

export default Extension;

Extension.prototype.onLoadRequest_ = function() {
  if (!this.module.loaded) {
    this.module.load().catch(function(value) {
      this.binding.closeError(value);
      }.bind(this));
  }
};
