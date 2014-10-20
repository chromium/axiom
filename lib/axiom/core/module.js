// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SemVer from 'semver';

import Err from 'axiom/core/err';
import AxiomEvent from 'axiom/core/event';
import BaseBinding from 'axiom/bindings/base';
import Extension from 'axiom/core/extension';

/**
 * A Module represents some code that can be loaded or unloaded.
 *
 * They can provide Services and Extensions (which extend Services provided
 * by other modules).
 *
 * The should only be constructed through ModuleManager.define(...), which
 * performs error checking before construction.
 *
 * @param {ModuleManager} moduleManager The parent ModuleManager.
 * @param {Object} descriptor The module descriptor.
 * @param {Object} opt_src An optional descriptor that specifies how the module
 *   should be loaded.  If not specified it's assumed the module implementation
 *   will be loaded in process by the client code.
 */
export var Module = function(moduleManager, descriptor, opt_srcDescriptor) {
  BaseBinding.call(this);

  this.moduleManager = moduleManager;
  this.descriptor = descriptor;

  this.serviceManager = moduleManager.serviceManager;

  this.moduleId = descriptor.id;
  this.semver = new SemVer(descriptor.version);

  this.extensions_ = {};

  /**
   * True if the code for the module is loaded.
   *
   * This is distinct from the ready state (inherited from BaseBinding) which
   * indicates that the module is done setting up its bindings.
   */
  this.loaded = !opt_srcDescriptor;

  var serviceId;

  console.log('New module: ' + this.moduleId);

  if (descriptor.provides) {
    for (serviceId in descriptor.provides) {
      this.defineService(serviceId, descriptor.provides[serviceId]);
    }
  }

  if (descriptor.extends) {
    for (serviceId in descriptor.extends) {
      this.defineExtension(serviceId, descriptor.extends[serviceId]);
    }
  }

  this.onReady.listenOnce(function() {
      console.log('Module ready: ' + this.moduleId);
    }.bind(this));
};

export default Module;

Module.prototype = Object.create(BaseBinding.prototype);

/**
 * Define a service provided by this module.
 *
 * @param {string} serviceId The identifier for the new service.
 * @param {Object} descriptor A descriptor for the new service.
 */
Module.prototype.defineService = function(serviceId, descriptor) {
  return this.serviceManager.defineService(this, serviceId, descriptor);
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
  var extension = this.serviceManager.extendService(
      serviceId, this, descriptor);
  this.extensions_[serviceId] = extension;
};

Module.prototype.getExtension_ = function(serviceId, opt_default) {
  if (!(serviceId in this.extensions_)) {
    if (typeof opt_default != 'undefined')
      return opt_default;

    throw 'Unknown extension: ' + this.moduleId + ' => ' + serviceId;
  }

  return this.extensions_[serviceId];
};

/**
 * Get the binding for an extension provided by this module.
 */
Module.prototype.getExtensionBinding = function(serviceId) {
  return this.getExtension_(serviceId).binding;
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
    if (this.loaded)
      return this.whenReady();

    reject(new Err.NotImplemented('Module not loaded'));
  });
};
