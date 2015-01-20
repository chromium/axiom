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

/**
 * @constructor
 * An event is a JavaScript object with addListener, removeListener, and
 * fire methods.
 *
 * @param {function(...)=} opt_firstCallback The optional function to call
 *     before the observers.
 * @param {function(...)=} opt_finalCallback The optional function to call
 *     after the observers.
 *
 * @return {function(...)} A function that, when called, invokes all callbacks
 *     with whatever arguments it was passed.
 */
var AxiomEvent = function(opt_firstCallback, opt_finalCallback) {
  this.firstCallback_ = opt_firstCallback;
  this.finalCallback_ = opt_finalCallback;

  // Array of [callback, self] arrays.
  this.observers_ = [];

  /**
   * Number of active observers.
   */
  this.observerCount = 0;

  // Pre-bound fire() method is easier to chain to other handlers.
  this.fire = this.fire_.bind(this);
};

export {AxiomEvent};
export default AxiomEvent;

/**
 * Dispatch this event.
 *
 * When fire is called the firstCallback is invoked, followed by all of the
 * listeners in the order they were attached, followed by the finalCallback.
 * (Yes, this is all synchronous.)
 *
 * This method is overwritten in the constructor to be bound to the event
 * instance.  This makes is a bit easier to chain the fire() method to other
 * events.
 *
 * @param {...*} var_args
 * @return {*} Any value returned by firstCallback or finalCallback.  If they
 *   both return a value, finalCallback wins.
 */
AxiomEvent.prototype.fire = function(var_args) {};

/**
 * @param {...*} var_args
 */
AxiomEvent.prototype.fire_ = function(var_args) {
  var rv;

  if (this.firstCallback_)
    rv = this.firstCallback_.apply(this, arguments);

  for (var i = this.observers_.length - 1; i >= 0; i--) {
    var observer = this.observers_[i];
    observer[0].apply(observer[1], arguments);
  }

  if (this.finalCallback_)
    rv = this.finalCallback_.apply(this, arguments);

  return rv;
};

/**
 * Add a callback function that unregisters itself after the first callback.
 *
 * @param {function(...)} callback The function to call back.
 * @param {Object} opt_obj The optional |this| object to apply the function
 *   to.  You can use this in place of bind() so you don't have to save
 *   the bound function for a future call to removeListener.
 */
AxiomEvent.prototype.listenOnce = function(callback, opt_obj) {
  var listener = function() {
    callback.apply(opt_obj || null, arguments);
    this.removeListener(listener);
  }.bind(this);

  this.addListener(listener);
};

/**
 * Add a callback function.
 *
 * @param {function(...)} callback The function to call back.
 * @param {Object} opt_obj The optional |this| object to apply the function
 *   to.  You can use this in place of bind() so you don't have to save
 *   the bound function for a future call to removeListener.
 */
AxiomEvent.prototype.addListener = function(callback, opt_obj) {
  if (!callback)
    throw new Error('Missing param: callback');

  this.observers_.unshift([callback, opt_obj]);
  this.observerCount = this.observers_.length;
};

/**
 * Remove a callback function.
 *
 * @param {function(...)} callback The callback function to remove.
 * @param {Object} opt_obj The optional |this| object passed when registering
 *   this observer.
*/
AxiomEvent.prototype.removeListener = function(callback, opt_obj) {
  for (var i = 0; i < this.observers_.length; i++) {
    if (this.observers_[i][0] == callback && this.observers_[i][1] == opt_obj) {
      this.observers_.splice(i, 1);
      break;
    }
  }

  this.observerCount = this.observers_.length;
};
