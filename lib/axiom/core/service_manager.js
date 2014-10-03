// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Err from '/axiom/core/err';
import Service from '/axiom/core/service';
import Extension from '/axiom/core/extension';

export var ServiceManager = function() {
  this.services_ = {};
};

export default ServiceManager;

ServiceManager.prototype.defineService = function(
    package, serviceId, descriptor) {
    if (serviceId in this.services_) {
      reject(new Err.Duplicate('package-id', serviceId));
      return;
    }

    this.services_[id] = new Service
};

ServiceManager.prototype.get = function(serviceId, opt_cx) {
  if (!(serviceId in this.services_))
    return Promise.reject(new Err.NotFound('service-id', serviceId));

  return this.services_[serviceId].get(opt_cx);
};

/**
 * Apply an extension to a service.
 *
 * @param {string} serviceId The name of a service to extend.
 * @param {Package} fromPackage The package that owns the extension.
 * @param {Object} descriptor A descriptor for the extension.  Treated as opaque
 *   data passed on to the target service.
 */
ServiceManager.prototype.extend = function(serviceId, fromPackage, descriptor) {
  return this.get(serviceId).then(
      function(service) {
        var extension = new Extension(service, fromPackage, descriptor);
        service.addExtension(extension);
        return extension;
      });
};
