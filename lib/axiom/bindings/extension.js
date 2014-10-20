// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomEvent from 'axiom/core/event';
import BaseBinding from 'axiom/bindings/base';

export var ExtensionBinding = function(
    sourceModuleId, targetServiceId, descriptor) {
  BaseBinding.call(this, descriptor);

  this.sourceModuleId = sourceModuleId;
  this.targetServiceId = targetServiceId;

  this.onLoadRequest = new AxiomEvent();

  this.onReady.listenOnce(function() {
      console.log('Extension ready: ' + sourceModuleId + ' => ' +
                  targetServiceId);
    }.bind(this));
};

export default ExtensionBinding;

ExtensionBinding.prototype = Object.create(BaseBinding.prototype);

ExtensionBinding.prototype.whenLoadedAndReady = function() {
  if (this.isReadyState('WAIT')) {
    console.log('Loading and waiting for extension: ' +
                this.sourceModuleId + ' => ' + this.targetServiceId);
    this.onLoadRequest.fire();
    return this.whenReady();
  }

  return this.whenReady();
};
