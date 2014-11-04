// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomEvent from 'axiom/core/event';

import BaseBinding from 'axiom/bindings/base';
import ExtensionBinding from 'axiom/bindings/extension';

/**
 * @constructor
 * @param {ModuleBinding} moduleBinding  The parent module.
 * @param {string} serviceId
 * @param {Object} serviceDescriptor
 */
export var ServiceBinding = function(
    moduleBinding, serviceId, serviceDescriptor) {
  BaseBinding.call(this, serviceDescriptor['service-binding']);

  console.log('New service', serviceDescriptor);

  this.serviceId = serviceId;

  /**
   * Subclass used for extensions of this service.
   */
  this.ExtensionBinding = ExtensionBinding.subclass(this, serviceDescriptor);

  /**
   * Extensions applied to this service.
   */
  this.extensionBindings = new Map();

  /**
   * Fires when someone asks to load this service.
   */
  this.onLoadRequest = new AxiomEvent();

  /**
   * Service implementations should listen to this event to be notified of
   * attempts to extend the service.
   */
  this.onExtend = new AxiomEvent();

  // List of extensions that were registered before the binding was ready.
  this.pendingExtensionBindings_ = new Set();

  // On first-ready, drain any pending extensions.
  this.onReady.listenOnce(function() {
      console.log('Service ready: ' + serviceId);
      this.pendingExtensionBindings_.forEach(this.onExtend.fire);
      this.pendingExtensionBindings_.clear();
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

/**
 * @param {ExtensionBinding} extensionBinding
 */
ServiceBinding.prototype.extend = function(
    sourceModuleBinding, extensionDescriptor) {
  console.log('Service extended: ' + this.serviceId +
              ' (' + this.readyState + ')', extensionDescriptor);

  var extensionBinding = new this.ExtensionBinding(
      sourceModuleBinding, extensionDescriptor);

  if (this.isReadyState('WAIT')) {
    this.pendingExtensionBindings_.add(extensionBinding);
  } else {
    this.assertReadyState('READY');
    this.onExtend.fire(extensionBinding);
  }

  return extensionBinding;
};
