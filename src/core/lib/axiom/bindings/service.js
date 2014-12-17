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
