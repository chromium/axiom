// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Err from 'axiom/core/err';
import AxiomEvent from 'axiom/core/event';

/**
 * An extension to a service.
 *
 * @param {Module} sourceModule The module providing the extension.
 * @param {Service} targetService The service being extended.
 * @param {Object} descriptor A descriptor for the extension.
 */
export var Extension = function(sourceModule, targetService, descriptor) {
  this.service = targetService;
  this.module = sourceModule;
  this.descriptor = descriptor;

  this.binding_ = null;
};

export default Extension;

/**
 * Bind this extension to its implementation.
 */
Extension.prototype.bind = function(binding) {
  this.binding_ = binding;
};

Extension.prototype.call = function(name, arg) {
  if (!this.binding_)
    return Promise.reject(new Err('Invalid', 'binding', null));

  if (!(name in this.binding_))
    return Promise.reject(new Err('NotFound', 'name'));

  return this.binding_[name](arg);
};
