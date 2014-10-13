// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SemVer from 'semver';

import Err from 'axiom/core/err';
import Extension from 'axiom/core/extension';

/**
 * Call this through ModuleManager.define(...) for proper error checking
 * reported via Promise<Module>.
 */
export var Module = function(moduleManager, descriptor) {
  this.moduleManager = moduleManager;
  this.descriptor = descriptor;

  this.serviceManager = moduleManager.serviceManager;

  this.id = descriptor.id;
  this.semver = new SemVer(descriptor.version);

  // We only support compiled-in modules at the moment.
  this.loaded = true;

  // Disable/enable isn't wired in yet.
  this.enabled = false;

  var serviceId;

  if (descriptor.provides) {
    for (serviceId in descriptor.provides) {
      this.serviceManager.defineService(
          this, serviceId, descriptor.provides[serviceId]);
    }
  }

  if (descriptor.extends) {
    for (serviceId in descriptor.extends) {
      this.serviceManager.extendService(serviceId, this,
                                        descriptor.extends[serviceId]);
    }
  }
};

export default Module;

/**
 * Define a service provided by this module.
 *
 * @param {string} serviceId The identifier for the new service.
 * @param {Object} descriptor A descriptor for the new service.
 */
Module.prototype.defineService = function(serviceId, descriptor) {
  return this.moduleManager.serviceManager.defineService(
      this, serviceId, descriptor);
};

/**
 * Bind to a service provided by this module.
 *
 * @param {string} serviceId An identifier for the service.
 * @param {Object} binding An object with 'get' and 'extend' callbacks (see
 *   service.js).
 *
 * @return {Promise<Service>}
 */
Module.prototype.bindService = function(serviceId, binding) {
  return this.moduleManager.serviceManager.bind(this, serviceId, binding);
};

/**
 * Define an extension provided by this module.
 *
 * @param {string} serviceId The id of the service to extend.
 * @param {Object} descriptor The extension descriptor.
 */
Module.prototype.defineExtension = function(serviceId, descriptor) {
  return this.serviceManager.get(serviceId).then(
      function(service) {
        var extension = new Extension(service, this, descriptor);
        service.extend(extension);
        return extension;
      });
};

/**
 * Bind to an extension provided by this module.
 */
Module.prototype.bindExtension = function(serviceId, binding) {

};

/**
 * Load the module from wherever it lives.
 *
 * For now the module must already be loaded.  In the near term future we'll
 * support runtime loading via HTML imports.  In the longer term future we
 * may support cross-origin loading via iframe or similar.
 *
 * @return {Promise}
 */
Module.prototype.load = function() {
  return new Promise(function(resolve, reject) {
    if (this.loaded) {
      resolve();
      return;
    }

    reject(new Err('NotImplemented', 'Module not loaded'));
  });
};

Module.prototype.checkDeps =  // Ensure deps are loaded.
Module.prototype.enable =     // Enable services, etc.
Module.prototype.disable =    // Disable services, etc.
Module.prototype.unload =     // Unload the module if possible.
function() {
  return new Promise(function(resolve, reject) {
    reject(new Err('NotImplemented', 'not implemented.'));
  });
};
