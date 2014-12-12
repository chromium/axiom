// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomEvent from 'axiom/core/event';
import BaseBinding from 'axiom/bindings/base';

/**
 * @constructor
 * @param {ServiceBinding} targetServiceBinding
 * @param {Object} targetServiceDescriptor
 * @param {ModuleBinding} sourceModuleBinding
 * @param {Object} extensionDescriptor
 */
export var ExtensionBinding = function(
    targetServiceBinding, targetServiceDescriptor,
    sourceModuleBinding, extensionDescriptor) {
  BaseBinding.call(this, targetServiceDescriptor['extension-binding']);

  /**
   * ServiceBinding representing the service being extended.
   */
  this.targetServiceBinding = targetServiceBinding;

  /**
   * The descriptor that defines the service being extended.
   */
  this.targetServiceDescriptor = targetServiceDescriptor;

  /**
   * ModuleBinding representing the module supplying the extension.
   */
  this.sourceModuleBinding = sourceModuleBinding;

  /**
   * The descriptor that defines a specific extension.
   */
  this.descriptor = extensionDescriptor;

  /**
   * Fires when someone asks to load this extension.
   */
  this.onLoadRequest = new AxiomEvent();

  this.onReady.listenOnce(function() {
      console.log('Extension ready: ' +
                  sourceModuleBinding.moduleId + ' => ' +
                  targetServiceBinding.serviceId);
    }.bind(this));
};

export default ExtensionBinding;

ExtensionBinding.prototype = Object.create(BaseBinding.prototype);

/**
 * Create a subclass to represent an extension to a particular service.
 *
 * @param {ServiceBinding} targetServiceBinding
 * @param {Object} targetServiceDescriptor
 */
ExtensionBinding.subclass = function(
    targetServiceBinding, targetServiceDescriptor) {

  // Constructor function for the subclass.
  var ExtensionBindingSubclass = function(
      sourceModuleBinding, extensionDescriptor) {
    ExtensionBinding.call(
        this,
        targetServiceBinding, targetServiceDescriptor,
        sourceModuleBinding, extensionDescriptor);
  };

  ExtensionBindingSubclass.prototype = Object.create(
      ExtensionBinding.prototype);

  return ExtensionBindingSubclass;
};

/**
 * @return {Promise}
 */
ExtensionBinding.prototype.whenLoadedAndReady = function() {
  if (this.isReadyState('WAIT')) {
    console.log('Loading and waiting for extension: ' +
                this.sourceModule.moduleId + ' => ' +
                this.targetServiceBinding.serviceId);
    this.onLoadRequest.fire();
    return this.whenReady();
  }

  return this.whenReady();
};
