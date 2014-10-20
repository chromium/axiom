// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Err from 'axiom/core/err';
import AxiomEvent from 'axiom/core/event';
import Extension from 'axiom/core/extension';
import ServiceBinding from 'axiom/bindings/service';

/**
 * Register a service provided by a module.
 *
 * @param {Module} The module that owns this service.
 **/
export var Service = function(module, serviceId, descriptor) {
  console.log('New service: ' + serviceId, descriptor);

  this.module = module;
  this.serviceId = serviceId;
  this.descriptor = descriptor;

  this.Binding = function() {
    ServiceBinding.call(this, serviceId, descriptor['service-binding']);
  };

  this.Binding.prototype = Object.create(ServiceBinding.prototype);

  this.binding = new this.Binding();
  this.binding.onLoadRequest.addListener(this.onLoadRequest_, this);
};

export default Service;

Service.prototype.onLoadRequest_ = function() {
  if (!this.module.loaded) {
    this.module.load().catch(function(value) {
      this.binding.closeError(value);
      }.bind(this));
  }
};

/**
 * Extend this service.
 *
 * @param {Extension} extension An Extension instance.
 **/
Service.prototype.defineExtension = function(fromModule, descriptor) {
  var extension = new Extension(fromModule, this, descriptor);
  this.binding.extend(extension);
  return extension;
};
