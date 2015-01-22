// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import AxiomEvent from 'axiom/core/event';
import BaseBinding from 'axiom/bindings/base';

/** @typedef ModuleBinding$$module$axiom$bindings$module */
var ModuleBinding;

/** @typedef ServiceBinding$$module$axiom$bindings$service */
var ServiceBinding;

/**
 * @constructor @extends{BaseBinding}
 * @param {ServiceBinding} targetServiceBinding
 * @param {Object} targetServiceDescriptor
 * @param {ModuleBinding} sourceModuleBinding
 * @param {Object} extensionDescriptor
 */
var ExtensionBinding = function(
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

export {ExtensionBinding};
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
                this.sourceModuleBinding.moduleId + ' => ' +
                this.targetServiceBinding.serviceId);
    this.onLoadRequest.fire();
    return this.whenReady();
  }

  return this.whenReady();
};
