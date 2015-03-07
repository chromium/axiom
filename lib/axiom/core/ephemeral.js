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
import Completer from 'axiom/core/completer';

/**
 * @constructor
 * @template T
 *
 * Base class used for objects whose backing resource may have a different
 * lifetime than the object itself.
 *
 * Ephemerals start out in state 'WAIT' and can transition from there to either
 * 'READY' or 'ERROR'.  'READY' can transition to 'CLOSED', indicating that the
 * object is no longer connected to its backing resource.  'ERROR' is a final
 * state indicating that the object never reached a 'READY' state.
 */
export var Ephemeral = function() {
  /** @private @type {!Completer<T>} */
  this.ephemeralCompleter_ = new Completer();

  /** @type {!Promise<T>} */
  this.ephemeralPromise = this.ephemeralCompleter_.promise;

  /** @type {Ephemeral.State} */
  this.readyState = Ephemeral.State.Wait;

  /** @type {boolean} */
  this.isValid = false;

  /** @type {*} */
  this.readyValue = null;

  /** @type {?string} */
  this.closeReason = null;

  /** @type {*} */
  this.closeValue = null;

  /** @const @type {!AxiomEvent} */
  this.onReady = new AxiomEvent();

  /** @const @type {!AxiomEvent} */
  this.onReset = new AxiomEvent();

  /** @const @type {!AxiomEvent} */
  this.onError = new AxiomEvent();

  /** @const @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();

  this.reset();
};

export default Ephemeral;

/** @enum {string} */
Ephemeral.State = {
  Wait: 'Wait',
  Ready: 'Ready',
  Error: 'Error',
  Closed: 'Closed'
};

Ephemeral.prototype.reset = function() {
  this.assertEphemeral('Wait', 'Closed', 'Error');

  this.readyState = Ephemeral.State.Wait;
  this.ephemeralCompleter_ = new Completer();
  this.ephemeralPromise = this.ephemeralCompleter_.promise;
  var ephemeralPromise = this.ephemeralPromise;

  this.ephemeralPromise.then(
    function(resolveValue) {
      if (this.ephemeralPromise != ephemeralPromise)
        return;

      this.closeReason = 'ok';
      this.closeValue = resolveValue;
      this.isValid = false;
      this.readyState = Ephemeral.State.Closed;

      this.onClose.fire(this.closeReason, resolveValue);
    }.bind(this),
    function(rejectValue) {
      if (this.ephemeralPromise != ephemeralPromise)
        return;

      this.closeReason = 'error';
      this.closeValue = rejectValue;
      this.isValid = false;

      if (this.readyState == Ephemeral.State.Ready) {
        this.readyState = Ephemeral.State.Closed;
        this.onClose.fire(this.closeReason, rejectValue);
      } else {
        this.readyState = Ephemeral.State.Error;
        this.onError.fire(rejectValue);
      }
    }.bind(this));

  this.onReset.fire(this.ephemeralPromise);
};

/**
 * Return true if this Ephemeral is in one of the listed states.
 *
 * @param {...string} var_args
 * @return {boolean}
 */
Ephemeral.prototype.isEphemeral = function(var_args) {
  for (var i = 0; i < arguments.length; i++) {
    var stateName = arguments[i];
    if (!Ephemeral.State.hasOwnProperty(stateName))
      throw new Error('Unknown state: ' + stateName);

    if (this.readyState == Ephemeral.State[stateName])
      return true;
  }

  return false;
};

/**
 * Throw an exception if this Ephemeral is not ready.
 */
Ephemeral.prototype.assertReady = function() {
  if (this.readyState != Ephemeral.State.Ready)
    throw new AxiomError.Ephemeral('READY', this.readyState);
};

/**
 * Throw an exception if this Ephemeral is not in one of the listed states.
 *
 * @param {...string} var_args
 */
Ephemeral.prototype.assertEphemeral = function(var_args) {
  if (!this.isEphemeral.apply(this, arguments)) {
    throw new AxiomError.Ephemeral(Array.prototype.slice.call(arguments),
                                   this.readyState);
  }
};

/**
 * @param {Ephemeral} otherReady
 */
Ephemeral.prototype.dependsOn = function(otherEphemeral) {
  otherEphemeral.onClose.addListener(
    function() {
      if (this.isEphemeral('Closed', 'Error'))
        return;

      this.closeError(new AxiomError.ParentClosed(otherEphemeral.closeReason,
                                                  otherEphemeral.closeValue));
    }.bind(this));
};

/**
 * @param {*=} opt_value
 */
Ephemeral.prototype.ready = function(opt_value) {
  this.assertEphemeral('Wait');
  this.readyValue = opt_value;
  this.readyState = Ephemeral.State.Ready;
  this.isValid = true;
  this.onReady.fire(opt_value);
};

/**
 * @param {*=} opt_value
 * @return {!Promise<T>}
 */
Ephemeral.prototype.closeOk = function(opt_value) {
  this.assertEphemeral('Ready');
  this.ephemeralCompleter_.resolve(opt_value);
  return this.ephemeralPromise;
};

/**
 * @param {*} value
 * @return {!Promise<T>}
 */
Ephemeral.prototype.closeError = function(value) {
  this.assertEphemeral('Ready', 'Wait');

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

  this.ephemeralCompleter_.reject(value);
  return this.ephemeralPromise;
};
