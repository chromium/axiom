// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Err from 'axiom/core/err';
import Service from 'axiom/core/service';
import Extension from 'axiom/core/extension';

export var ServiceManager = function() {
  this.services_ = {};
};

export default ServiceManager;

ServiceManager.prototype.defineService = function(
    module, serviceId, descriptor) {
  if (serviceId in this.services_)
    throw new Err.Duplicate('service-id', serviceId);

  var service = new Service(module, serviceId, descriptor);
  this.services_[serviceId] = service;
  return service;
};

ServiceManager.prototype.getService_ = function(serviceId, opt_default) {
  if (!(serviceId in this.services_)) {
    if (typeof opt_default != 'undefined')
      return opt_default;

    throw 'Unknown service: ' + serviceId;
  }

  return this.services_[serviceId];
};

/**
 * Get the binding for the service with the given serviceId.
 *
 * @param {string} serviceId The identifier of the requested service.
 * @return {ServiceBinding} The service-specific binding subclass.
 */
ServiceManager.prototype.getServiceBinding = function(serviceId) {
  return this.getService_(serviceId).binding;
};

/**
 * Apply an extension to a service.
 *
 * @param {string} serviceId The name of a service to extend.
 * @param {Module} fromModule The module that owns the extension.
 * @param {Object} descriptor A descriptor for the extension.  Treated as opaque
 *   data passed on to the target service.
 */
ServiceManager.prototype.extendService = function(
    serviceId, fromModule, descriptor) {
  return this.getService_(serviceId).defineExtension(fromModule, descriptor);
};
