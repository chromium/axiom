// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SemVer from 'semver';
import Err from 'axiom/core/err';

/**
 * Call this through PackageManager.define(...) for proper error checking
 * reported via Promise<Package>.
 */
export var Package = function(packageManager, descriptor) {
  this.packageManager = packageManager;
  this.descriptor = descriptor;

  this.id = descriptor.id;
  this.semver = new SemVer(descriptor.version);

  // We only support compiled-in packages at the moment.
  this.loaded = true;

  // Disable/enable isn't wired in yet.
  this.enabled = false;
};

export default Package;

/**
 * Define a service provided by this package.
 *
 * @param {string} serviceId The identifier for the new service.
 * @param {Object} descriptor A descriptor for the new service.
 */
Package.prototype.defineService = function(serviceId, descriptor) {
  return this.packageManager.serviceManager.defineService(
      this, serviceId, descriptor);
};

/**
 * Bind to a service provided by this package.
 *
 * @param {string} serviceId An identifier for the service.
 * @param {Object} binding An object with 'get' and 'extend' callbacks (see
 *   service.js).
 *
 * @return {Promise<Service>}
 */
Package.prototype.bindService = function(serviceId, binding) {
  return this.packageManager.serviceManager.bind(this, serviceId, binding);
};

/**
 * Define an extension provided by this package.
 *
 * @param {string} serviceId The id of the service to extend.
 * @param {Object} descriptor The extension descriptor.
 */
Package.prototype.defineExtension = function(serviceId, descriptor) {
  return this.serviceManager.get(serviceId).then(
      function(service) {
        var extension = new Extension(service, this, descriptor);
        service.extend(extension);
        return extension;
      });
};

/**
 * Load the package from wherever it lives.
 *
 * For now the package must already be loaded.  In the near term future we'll
 * support runtime loading via HTML imports.  In the longer term future we
 * may support cross-origin loading via iframe or similar.
 *
 * @return {Promise}
 */
Package.prototype.load = function() {
  return new Promise(function(resolve, reject) {
    if (this.loaded) {
      resolve();
      return;
    }

    reject(new Err('NotImplemented', 'Package not loaded'));
  });
};

Package.prototype.checkDeps =  // Ensure deps are loaded.
Package.prototype.enable =     // Enable services, etc.
Package.prototype.disable =    // Disable services, etc.
Package.prototype.unload =     // Unload the package if possible.
function() {
  return new Promise(function(resolve, reject) {
    reject(new Err('NotImplemented', 'not implemented.'));
  });
};
