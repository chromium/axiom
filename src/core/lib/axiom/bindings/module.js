// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import BaseBinding from 'axiom/bindings/base';
import ServiceBinding from 'axiom/bindings/service';

/**
 * @constructor
 * @param {ModuleManager} moduleManager
 * @param {string} moduleId
 * @param {Object} descriptor
 */
export var ModuleBinding = function(moduleManager, descriptor) {
  BaseBinding.call(this);

  if (!descriptor.id)
    throw new AxiomError.Missing('module-id');

  if (!descriptor.version)
    throw new AxiomError.Missing('version');

  this.moduleManager = moduleManager;
  this.moduleId = descriptor.id;
  this.version = descriptor.version;
  this.descriptor = descriptor;

  /**
   * Services that we provide, keyed by the bare service id.
   */
  this.serviceBindings_ = new Map();

  // Temporary used in loops below.
  var serviceBinding;

  if (descriptor['provides']) {
    for (var serviceId in descriptor['provides']) {
      serviceBinding = new ServiceBinding(
          this, serviceId, descriptor['provides'][serviceId]);
      this.serviceBindings_.set(serviceId, serviceBinding);
    }
  }

  /**
   * Extensions we define, keyed by the target module-service-id.
   */
  this.extensionBindings_ = new Map();

  if (descriptor['extends']) {
    for (var moduleServiceId in descriptor['extends']) {
      serviceBinding = this.moduleManager.getServiceBinding(moduleServiceId);
      var extensionBinding = serviceBinding.extend(
          this, descriptor['extends'][moduleServiceId]);
      this.extensionBindings_.set(moduleServiceId, extensionBinding);
    }
  }
};

export default ModuleBinding;

ModuleBinding.prototype = Object.create(BaseBinding.prototype);

ModuleBinding.prototype.getServiceBinding = function(serviceId) {
  if (!this.serviceBindings_.has(serviceId))
    throw new AxiomError.NotFound('service-id', serviceId);
  return this.serviceBindings_.get(serviceId);
};

ModuleBinding.prototype.getExtensionBinding = function(moduleServiceId) {
  if (!this.extensionBindings_.has(moduleServiceId))
    throw new AxiomError.NotFound('module-service-id', moduleServiceId);
  return this.extensionBindings_.get(moduleServiceId);
};
