// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Err from '/axiom/core/err';
import AxiomEvent from '/axiom/core/event';

/**
 * Register a service provided by a package.
 *
 * @param {Package} The package that owns this service.
 **/
export var Service = function(package) {
  this.package = package;

  // The callbacks used to communicate with the service implementation.
  this.binding_ = null;

  // True if we wish this service were enabled regardless of the state of the
  // parent package.
  this.localEnable_ = true;

  /**
   * True if we're *really* enabled.
   */
  this.enabled = package.enabled;

  /**
   * Raised when this service is disabled, either because the parent package
   * was disabled or because it was locally disabled.
   */
  this.onDisable = new AxiomEvent(function() {
      this.enabled = false;
    }.bind(this));

  /**
   * Raised when this service is locally enabled and its parent package is
   * enabled.
   */
  this.onEnable = new AxiomEvent(function() {
      this.enabled = true;
    }.bind(this));

  package.onDisable.addListener(this.onDisable.fire);
  package.onEnable.addListener(function() {
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
 * extend succeeds, or rejects if not.  The argument for this callback is
 * an opaque value passed directly to the service.
 */
Service.prototype.bind = function(binding) {
  if (this.binding_)
    throw new Error('Already bound');

  this.binding_ = binding;
};

/**
 * Turn this service off.
 *
 * If the parent package is already disabled this will not raise an event, but
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
 * This will have no effect unless/until the parent package is also enabled.
 */
Service.prototype.enable = function() {
  if (this.localEnable_)
    return;

  this.localEnable_ = true;
  if (this.package.enabled)
    this.onEnable.fire();
};

/**
 * Return a promise to a service.
 *
 * @param {Object} opt_cx Optional, reserved for future use.
 *
 * In the future we may use this to marshal a cross-origin connection.  For
 * example, opt_cx could contain a message port connected to a consumer of this
 * service.
 **/
Service.prototype.get = function(opt_cx) {
  if (!this.enabled)
    return Promise.reject(new Err.Invalid('enabled', false));

  // Don't *really* pass cx, to avoid temptation.
  return this.binding_.get(/* opt_cx */);
};

/**
 * Extend a service.
 *
 * @param {Extension} extension An Extension instance.
 **/
Service.prototype.extend = function(extension) {
  this.binding_.extend(extension);
};
