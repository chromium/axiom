// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomEvent from '/axiom/core/event';

/**
 * An extension to a service.
 *
 * @param {Package} package The package providing the extension.
 * @param {Service} service The service being extended.
 * @param {Object} descriptor A descriptor for the extension.
 */
export var Extension = function(package, service, descriptor) {
  this.package = package;
  this.service = service;
  this.descriptor = descriptor;

  this.binding = null;
};

export default Extension;

Extension.prototype.bind = function(binding) {

};
