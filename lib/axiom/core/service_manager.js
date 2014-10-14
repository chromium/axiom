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

/**
 * Get a service for the given serviceId.
 *
 * @param {string} serviceId The identifier of the requested service.
 * @return {Promise<*>} Returns a promise that resolves to the target service.
 */
ServiceManager.prototype.getService = function(serviceId) {
  if (!(serviceId in this.services_))
    return Promise.reject(new Err.NotFound('service-id', serviceId));

  // get() returns a promise.
  return this.services_[serviceId].get();
};

/**
 * Bind to a service.
 *
 * @param {string} serviceId The name of a service to extend.
 * @param {Object} binding The service binding.  (See ./service.js:bind)
 */
ServiceManager.prototype.bindService = function(serviceId, binding) {
  return this.getService(serviceId).then(
      function(service) {
        return service.bind(binding);
      });
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
    fromModule, serviceId, descriptor) {
  return this.getService(serviceId).then(
      function(service) {
        var extension = new Extension(fromModule, service, descriptor);
        service.defineExtension(extension);
        return extension;
      });
};
