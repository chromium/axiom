// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/err';
import AxiomEvent from 'axiom/core/event';

/**
 * The base class for bindings, which includes the ability to mark the binding
 * as 'ready'.
 *
 * A binding that is ready has had all of its event handlers attached such that
 * it's able to communication with the underlying implementation.
 */
export var BaseBinding = function(opt_descriptor) {
  this.readyState = BaseBinding.state.WAIT;

  this.isOpen = false;

  this.readyValue = null;
  this.closeReason = null;
  this.closeValue = null;

  this.onReady = new AxiomEvent(function(value) {
      this.readyValue = value;
      this.readyState = BaseBinding.state.READY;
      this.isOpen = true;
    }.bind(this));

  this.onClose = new AxiomEvent(function(reason, value) {
      this.closeReason = (reason == 'ok' ? 'ok' : 'error');
      this.closeValue = value;
      this.isOpen = false;

      if (reason == 'ok') {
        this.readyState = BaseBinding.state.CLOSED;
      } else {
        this.readyState = BaseBinding.state.ERROR;
      }
    }.bind(this));

  if (opt_descriptor)
    this.describe(opt_descriptor);
};

export default BaseBinding;

BaseBinding.state = {
  WAIT: 'WAIT',
  READY: 'READY',
  ERROR: 'ERROR',
  CLOSED: 'CLOSED'
};

BaseBinding.prototype.bind = function(self, obj) {
  for (var name in obj) {
    var target = this[name];

    if (!target)
      throw new Error('Unknown property :' + name);

    if (typeof target == 'function') {
      if (!('impl' in target))
        throw new Error('Function is not bindable: ' + name);

      if (target.impl)
        throw new Error('Function already bound: ' + name);

      if (self) {
        target.impl = obj[name].bind(self);
      } else {
        target.impl = obj[name];
      }

    } else if (target instanceof AxiomEvent) {
      target.addListener(obj[name], self);
    }
  }
};

BaseBinding.prototype.describe = function(descriptor) {
  for (var name in descriptor) {
    var entry = descriptor[name];
    if (typeof entry == 'object') {
      if (entry.type == 'method') {
        this.describeMethod(name, entry.args);
      } else if (entry.type == 'event') {
        this[name] = new AxiomEvent();
      }
    }
  }
};

BaseBinding.prototype.describeMethod = function(name, args) {
  var f = function() {
    if (!f.impl)
      throw new Error('Unbound method: ' + name);

    // Fast paths for small # of args.
    if (!arguments.length)
      return f.impl();

    if (arguments.length == 1)
      return f.impl(arguments[0]);

    if (arguments.length == 2)
      return f.impl(arguments[0], arguments[1]);

    return f.impl.apply(null, arguments);
  };

  f.impl = null;

  this[name] = f;
};

BaseBinding.prototype.isReadyState = function(/* stateName , ... */) {
  for (var i = 0; i < arguments.length; i++) {
    var stateName = arguments[i];
    if (!BaseBinding.state.hasOwnProperty(stateName))
      throw new Error('Unknown state: ' + stateName);

    if (this.readyState == BaseBinding.state[stateName])
      return true;
  }

  return false;
};

BaseBinding.prototype.assertReady = function() {
  if (this.readyState != BaseBinding.state.READY)
    throw new Error('Invalid ready call: ' + this.readyState);
};

BaseBinding.prototype.assertReadyState = function(/* stateName , ... */) {
  if (!this.isReadyState.apply(this, arguments))
    throw new Error('Invalid ready call: ' + this.readyState);
};

BaseBinding.prototype.dependsOn = function(otherReady) {
  otherReady.onClose.addListener(function() {
      if (this.isReadyState('CLOSED', 'ERROR'))
        return;

      this.closeError('ParentClosed',
                      [otherReady.closeReason, otherReady.closeValue]);
    }.bind(this));
};

/**
 * Returns a promise that resolves when the binding is ready, or immediately
 * if already ready.
 *
 * If the binding goes "unready", and you expect it to ever be ready again,
 * you'll need to call this function again to register your interest.
 *
 * The promise will be rejected if the binding goes to some state other than
 * ready.
 */
BaseBinding.prototype.whenReady = function() {
  if (this.readyState == 'READY')
    return Promise.resolve();

  if (this.readyState != 'WAIT')
    return Promise.reject(this.closeValue);

  return new Promise(function(resolve, reject) {
    var onClose = function(value) {
      this.onReady.removeListener(resolve);
      reject(value);
    }.bind(this);

    this.onReady.listenOnce(function(value) {
      this.onClose.removeListener(onClose);
      resolve(value);
    }.bind(this));

    this.onClose.listenOnce(onClose);
  }.bind(this));
};

BaseBinding.prototype.reset = function() {
  this.assertReadyState('WAIT', 'CLOSED', 'ERROR');
  this.readyState = BaseBinding.state['WAIT'];
};

BaseBinding.prototype.ready = function(value) {
  this.assertReadyState('WAIT');
  this.onReady.fire(value);
};

BaseBinding.prototype.closeOk = function(value) {
  this.assertReadyState('READY');
  this.onClose.fire('ok', value);
};

BaseBinding.prototype.closeErrorValue = function(value) {
  this.assertReadyState('READY', 'WAIT');
  this.onClose.fire('error', value);
};

BaseBinding.prototype.closeError = function(name, arg) {
  this.closeErrorValue(new AxiomError(name, arg));
};
