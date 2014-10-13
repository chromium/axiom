// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Err from 'axiom/core/err';
import AxiomEvent from 'axiom/core/event';
import Extension from 'axiom/core/extension';

/**
 * Register a service provided by a module.
 *
 * @param {Module} The module that owns this service.
 **/
export var Service = function(module) {
  this.module = module;

  // The callbacks used to communicate with the service implementation, set by
  // the bind() method.
  this.binding_ = null;

  // True if we wish this service were enabled regardless of the state of the
  // parent module.
  this.localEnable_ = true;

  /**
   * True if we're *really* enabled.
   */
  this.enabled = module.enabled;

  /**
   * Raised when this service is disabled, either because the parent module
   * was disabled or because it was locally disabled.
   */
  this.onDisable = new AxiomEvent(function() {
      this.enabled = false;
    }.bind(this));

  /**
   * Raised when this service is locally enabled and its parent module is
   * enabled.
   */
  this.onEnable = new AxiomEvent(function() {
      this.enabled = true;
    }.bind(this));

  module.onDisable.addListener(this.onDisable.fire);
  module.onEnable.addListener(function() {
      if (this.localEnable_)
        this.onEnable.fire();
    }.bind(this));
};

export default Service;

/**
 * Bind this service to an implementation.
 *
 * @param {Object} binding An object with 'get', and 'extend' callback
 *   functions.
 *
 * The 'get' callback should return a Promise that resolves to the service.  The
 * parameter list of this callback is reserved for future use.
 *
 * The 'extend' callback should return a Promise that resolves to null if the
 * extend succeeds, or rejects with an Err if not.  The argument for this
 * callback is an opaque value passed directly to the service.
 */
Service.prototype.bind = function(binding) {
  if (this.binding_)
    throw new Error('Already bound');

  this.binding_ = binding;
};

/**
 * Turn this service off.
 *
 * If the parent module is already disabled this will not raise an event, but
 * the service will not resume when/id the module is enabled.
 */
Service.prototype.disable = function() {
  if (!this.localEnable_)
    return;

  this.localEnable_ = false;
  if (this.enabled)
    this.onDisable.fire();
};

/**
 * Turn this service on.
 *
 * This will have no effect unless/until the parent module is also enabled.
 */
Service.prototype.enable = function() {
  if (this.localEnable_)
    return;

  this.localEnable_ = true;
  if (this.module.enabled)
    this.onEnable.fire();
};

/**
 * Return a promise to a service.
 **/
Service.prototype.get = function() {
  if (!this.enabled)
    return Promise.reject(new Err.Invalid('enabled', false));

  if (!this.binding)
    return Promise.reject(new Err.Invalid('binding', null));

  return this.binding_.get();
};

/**
 * Extend a service.
 *
 * @param {Extension} extension An Extension instance.
 **/
Service.prototype.defineExtension = function(fromModule, descriptor) {
  if (!this.binding)
    return Promise.reject(new Err.Invalid('binding', null));

  var extension = new Extension(fromModule, this, descriptor);
  this.binding_.extend(extension);
};
