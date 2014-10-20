// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomEvent from 'axiom/core/event';
import BaseBinding from 'axiom/bindings/base';

export var ServiceBinding = function(serviceId, descriptor) {
  BaseBinding.call(this, descriptor);

  this.serviceId = serviceId;

  this.onLoadRequest = new AxiomEvent();

  /**
   * Service implementations should listen to this event to be notified of
   * attempts to extend the service.
   */
  this.onExtend = new AxiomEvent();

  // List of extensions that were registered before the binding was ready.
  this.pendingExtensions_ = [];

  // On first-ready, drain any pending extensions.
  this.onReady.listenOnce(function() {
      console.log('Service ready: ' + serviceId);
      for (var i = 0; i < this.pendingExtensions_.length; i++) {
        this.onExtend.fire(this.pendingExtensions_[i]);
      }

      this.pendingExtensions_ = null;
    }.bind(this));
};

export default ServiceBinding;

ServiceBinding.prototype = Object.create(BaseBinding.prototype);

ServiceBinding.prototype.whenLoadedAndReady = function() {
  if (this.isReadyState('WAIT')) {
    console.log('Loading and waiting for service: ' + this.serviceId);
    this.onLoadRequest();
    return this.whenReady();
  }

  return this.whenReady();
};

ServiceBinding.prototype.extend = function(extension) {
  console.log('Service extended: ' + this.serviceId +
              ' (' + this.readyState + ')', extension);
  if (this.isReadyState('WAIT')) {
    this.pendingExtensions_.push(extension);
    return;
  }

  this.assertReadyState('READY');
  this.onExtend.fire(extension);
};
