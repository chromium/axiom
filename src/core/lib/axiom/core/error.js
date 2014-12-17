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
 * An error value used when rejecting a promise.
 *
 * TODO(rginda): I haven't used Promises enough yet to know if rejecting a
 * promise is a friendly thing to do.  It may be that we'd really rather
 * resolve a promise to an error value for non-fatal failures.  If that's
 * the case we should change this to a Result class which can indicate
 * "ok" with a result value or "error" with an Err value.
 */
export var AxiomError = function(name, value) {
  Error.call(this);

  // The Error ctor doesn't seem to apply the message argument correctly, so
  // we set it by hand instead.  The message property gives DevTools an
  // informative message to dump for uncaught exceptions.
  this.message = name + ': ' + JSON.stringify(value);
  // Similar with the stack property.
  this.stack = (new Error()).stack;

  this.errorName = name;
  this.errorValue = value;
};

export default AxiomError;

/**
 * Subclass of a native Error.
 */
AxiomError.prototype = Object.create(Error.prototype);

AxiomError.prototype.toString = function() {
  return 'AxiomError: ' + this.message;
};

// Define a function which will construct a new error with the given name.
// The constructor will also have a static 'test(err)' method which
// returns true if the given AxiomError instance has the same name.
export var mkerr = function(name, argNames) {
  var ctor = function(/* ... */) {
    if (arguments.length != argNames.length) {
      throw new Error('Not enough arguments for error :' + name +
                      ', got: ' + arguments.length + ', expected: ' +
                      argNames.length);
    }

    var value = {};
    for (var i = 0; i < argNames.length; i++) {
      value[argNames[i]] = arguments[i];
    }

    return new AxiomError(name, value);
  };

  ctor.test = function(err) {
    return (err instanceof AxiomError && err.errorName ===  name);
  };

  AxiomError[name] = ctor;
};

mkerr('Duplicate', ['type', 'value']);
mkerr('Incompatible', ['type', 'value']);
mkerr('Interrupt', []);
mkerr('Invalid', ['type', 'value']);
mkerr('Missing', ['type']);
mkerr('NotFound', ['type', 'value']);
mkerr('NotImplemented', ['msg']);
mkerr('ParentClosed', ['reason', 'value']);
mkerr('Runtime', ['message']);
mkerr('TypeMismatch', ['expectedType', 'gotValue']);
mkerr('Unknown', ['value']);
