// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SemVer from 'semver';
import Err from 'axiom/err';

/**
 * Call this through Loader.define(...) for proper error checking reported
 * via Promise<Implementation>.
 */
export var Implementation = function(descriptor) {
  this.descriptor = descriptor;
  this.semver = new SemVer(descriptor.version);

  // Implementations can be loaded at compile time, so in the real world we'd
  // set `this.loaded` based on properties of the descriptor.  For now it's
  // just false.
  this.loaded = false;

  this.enabled = false;
};

export default Implementation;

/**
 * Ensure that this implementation's dependencies are available.
 *
 * @return {Promise}
 */
Implementation.prototype.checkDeps = function() {
  // TODO.
};

/**
 * Notify other implementations of our extensions.
 *
 * @return {Promise}
 */
Implementation.prototype.enable = function() {
  // TODO.
};

/**
 * Notify other implementations that our extensions no longer apply.
 *
 * @return {Promise}
 */
Implementation.prototype.disable = function() {
  // TODO.
};

/**
 * Load the implementation from wherever it lives.
 *
 * @return Promise
 */
Implementation.prototype.load = function() {
  return new Promise(function(resolve, reject) {
    if (this.loaded) {
      resolve();
      return;
    }

    // Lookup a specific loader based on the "source" of the descriptor.
    var loader = this.findLoader_();
    if (!loader) {
      reject(new Err.NotFound('loader', this.descriptor.id));
      return;
    }

    // Ask the loader to load the source and pass on a reference to
    // `this` (or a messaging-based proxy for this?).
    return loader.load(this).then(function(getObjectHandler) {
        this.loaded = true;
        this.getObjectHandler_ = getObjectHandler;
        resolve();
      }.bind(this));
  });
};

/**
 * Find a class that knows how to load this implementation.
 */
Implementation.prototype.findLoader_ = function() {
  // TODO.
};

/**
 * Unload the implementation.
 *
 * @param {bool} opt_retract Optional, if true this implementation's extensions
 *   will be retracted before unload.
 */
Implementation.prototype.unload = function(opt_retract) {
  // TODO.
};

/**
 * Get an object (or messaging based proxy) from an instance.
 *
 * @param {string} An object identifier provided by this implementation.
 * @return {Promise<Object>}
 */
Implementation.prototype.getObject = function(objectId) {
  var get = new Promise(function(resolve, reject) {
      if (!this.getObjectHandler_)
        return new Err.Missing('getObjectHandler');

      return this.getObjectHandler_(objectId);
  }.bind(this));

  if (!this.loaded)
    return this.load().then(get);

  return get;
};
