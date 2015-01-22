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

import AxiomError from 'axiom/core/error';
import AxiomEvent from 'axiom/core/event';

/**
 * @constructor
 * The base class for bindings, which includes the ability to mark the binding
 * as 'ready'.
 *
 * A binding that is ready has had all of its event handlers attached such that
 * it's able to communication with the underlying implementation.
 *
 * @param {Object=} opt_descriptor Optional descriptor defining the "bindable"
 *   properties.
 */
var BaseBinding = function(opt_descriptor) {
  this.readyState = BaseBinding.state.WAIT;

  this.isOpen = false;

  /** @type {?*} */
  this.readyValue = null;

  /** @type {?string} */
  this.closeReason = null;

  /** @type {?*} */
  this.closeValue = null;

  this.onReady = new AxiomEvent(function(/** * */ value) {
      this.readyValue = value;
      this.readyState = BaseBinding.state.READY;
      this.isOpen = true;
    }.bind(this));

  this.onClose = new AxiomEvent(function(/** string */ reason,
                                         /** * */ value) {
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

export {BaseBinding};
export default BaseBinding;

/** @enum {string} */
BaseBinding.state = {
  WAIT: 'WAIT',
  READY: 'READY',
  ERROR: 'ERROR',
  CLOSED: 'CLOSED'
};

/**
 * Attach to a bindable methods on this instance.
 *
 * Call sites look like:
 *   $b->bind(this, { 'doSomething': this.doSomething_, ...})
 *
 * You can also use the form:
 *   $b->bind(this, { 'doSomething': 'doSomething_', ...})

 * @param {?Object} self The object to use as `this` when invoking the target
 *   function, or null to execute the function as-is.
 * @param {Object<string, (function(...)|string)>} obj A map of
 *   bindable-method-names to target functions.
 */
BaseBinding.prototype.bind = function(self, obj) {
  for (var name in obj) {
    /**
     * The method or property we're trying to bind to.
     * @type {function(...)}
     */
    var target = this[name];

    if (!target)
      throw new AxiomError.NotFound('bind-target', name);

    /**
     * The method implementation or property value being bound.
     * @type {function(...)}
     */
    var impl = (self && typeof obj[name] == 'string') ? self[impl] : obj[name];

    if (typeof target == 'function') {
      if (!('impl' in target))
        throw new AxiomError.Invalid('bind-target', name);

      if (target.impl != null)
        throw new AxiomError.Duplicate('bind-target', name);

      if (typeof impl != 'function')
        throw new AxiomError.TypeMismatch('function', impl);

      if (self) {
        target.impl = impl.bind(self);
      } else {
        target.impl = impl;
      }

    } else if (target instanceof AxiomEvent) {
      target.addListener(impl, self);
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
      } else if (entry.type == 'map') {
        this[name] = new Map();
      }
    }
  }
};

/**
 * @param {string} name
 * @param {Object} args
 * @param {function(...)=} opt_first
 */
BaseBinding.prototype.describeMethod = function(name, args, opt_first) {
  var f = function() {
    if (!f.impl)
      throw new Error('Unbound method: ' + name);

    if (opt_first) {
      var f_arguments = arguments;
      return opt_first.apply(null, arguments).then(
        function() {
          return f.impl.apply(null, f_arguments);
        });
    }

    return f.impl.apply(null, arguments);
  };

  f.impl = null;

  this[name] = f;
};

/**
 * @param {...string} var_args
 */
BaseBinding.prototype.isReadyState = function(var_args) {
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

/**
 * @param {...string} var_args
 */
BaseBinding.prototype.assertReadyState = function(var_args) {
  if (!this.isReadyState.apply(this, arguments))
    throw new Error('Invalid ready call: ' + this.readyState);
};

/**
 * @param {BaseBinding} otherReady
 */
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

/**
 * @param {*=} opt_value
 */
BaseBinding.prototype.ready = function(opt_value) {
  this.assertReadyState('WAIT');
  this.onReady.fire(opt_value);
};

/**
 * @param {*=} opt_value
 */
BaseBinding.prototype.closeOk = function(opt_value) {
  this.assertReadyState('READY');
  this.onClose.fire('ok', opt_value);
};

/**
 * @param {*} value
 */
BaseBinding.prototype.closeErrorValue = function(value) {
  this.assertReadyState('READY', 'WAIT');

  if (!(value instanceof AxiomError)) {
    if (value instanceof Error) {
      value = value.toString() + ' ' + value.stack;
    } else if (value instanceof Object && 'toString' in value) {
      value = value.toString();
    } else {
      value = JSON.stringify(value);
    }

    value = new AxiomError.Unknown(value);
  }

  this.onClose.fire('error', value);
  return value;
};

/**
 * @param {string} name
 * @param {Array<*>} arg
 */
BaseBinding.prototype.closeError = function(name, arg) {
  var proto = Object.create(AxiomError[name].prototype);
  return this.closeErrorValue(AxiomError[name].apply(proto, arg));
};
