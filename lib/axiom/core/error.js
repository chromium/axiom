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
 * An error value used when rejecting a promise.
 *
 * TODO(rginda): I haven't used Promises enough yet to know if rejecting a
 * promise is a friendly thing to do.  It may be that we'd really rather
 * resolve a promise to an error value for non-fatal failures.  If that's
 * the case we should change this to a Result class which can indicate
 * "ok" with a result value or "error" with an Err value.
 *
 * @param {!string} name The error class name.
 * @param {!Array<*>} argNames Argument names of this error instance.
 * @param {Arguments|Array} args Argument values of this error instance.
 */
var AxiomError = function(name, argNames, args) {
  if (args.length != argNames.length) {
    throw new Error('Not enough arguments for error: ' + name +
                    ', got: ' + args.length + ', expected: ' +
                    argNames.length);
  }

  Error.call(this);

  /** @const {string} */
  this.errorName = name;

  /** @const {*} */
  this.errorValue = {};

  var messageParts = [];

  for (var i = 0; i < argNames.length; i++) {
    var key = argNames[i];
    var val = args[i];
    this.errorValue[key] = val;
    messageParts.push(key + ': ' + JSON.stringify(val));
  }

  // The Error ctor doesn't seem to apply the message argument correctly, so
  // we set it by hand instead.  The message property gives DevTools an
  // informative message to dump for uncaught exceptions.
  /** @const {string} */
  this.message = 'AxiomError.' + name + ' {' + messageParts.join(', ') + '}';

  // Similar with the stack property.
  /** @type {string} */
  this.stack = (new Error()).stack;
};

export {AxiomError};
export default AxiomError;

/**
 * Stringified error subclass name.
 *
 * @const {string}
 */
AxiomError.errorName = 'AxiomError';

/**
 * List of argument names defined for the error subclass.
 *
 * @const {Array<string>}
 */
AxiomError.argNames = [];

/**
 * Subclass of a native Error.
 */
AxiomError.prototype = Object.create(Error.prototype);

/**
 * Checks if the given error object is an instance of AxiomError.
 *
 * This method is also copied onto all AxiomError subclasses, where it can
 * be used to check if the error object is an instance of the particular
 * subclass.
 *
 * @this {function(...)}
 * @param {Object} err
 */
AxiomError.test = function(err) {
  return (err instanceof AxiomError && err.errorName === this.errorName);
};

/**
 * @return {!string}
 */
AxiomError.prototype.toString = function() {
  return this.message;
};

/**
 * @param {Arguments} args
 */
AxiomError.prototype.init = function(args) {
  AxiomError.call(this, this.ctor.errorName, this.ctor.argNames, args);
};

/**
 * @param {Object<string, function(...)>} map
 */
AxiomError.subclasses = function(map) {
  for (var name in map) {
    AxiomError.subclass(map[name], name);
  }
};

/**
 * Convert error instance into a object for transport.
 *
 * @return {!Object}
 */
AxiomError.prototype.toObject = function() {
  var result = {};
  result.name = this.errorName;
  result.value = this.errorValue;
  return result;
};

/**
 * Create an error instance from a object.
 *
 * @param {!Object} obj
 * @return {!AxiomError}
 */
AxiomError.fromObject = function(obj) {
  var name = obj.name;
  var argNames = [];
  var args = [];
  for(var key in obj.value) {
    argNames.push(key);
    args.push(obj.value[key]);
  }

  return new AxiomError(name, argNames, args);
};

/**
 * @param {function(...)} ctor
 * @param {string=} opt_name
 */
AxiomError.subclass = function(ctor, opt_name) {
  var match = ctor.toString().match(/^function [^\(]*\(([^\)]*)\)/);
  if (!match)
    throw new Error('Error parsing AxiomError constructor: ' + ctor.toString());

  var argNames = [];

  if (match[1]) {
    ctor.argNames = match[1].split(/\s*,\s*/);
  } else {
    ctor.argNames = [];
  }

  ctor.errorName = opt_name || ctor.name;
  ctor.test = AxiomError.test.bind(ctor);
  ctor.prototype = Object.create(AxiomError.prototype);
  ctor.prototype.ctor = ctor;
};

// NOTE: See the note at the end of this file.

/**
 * @constructor @extends{AxiomError}
 */
AxiomError.AbstractCall = function() { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 *
 * @param {string} type
 * @param {*} value
 */
AxiomError.Duplicate = function(type, value) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 *
 * @param {string|Array} expected
 * @param {string} found
 */
AxiomError.Ephemeral = function(expected, found) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} type
 * @param {*} value
 */
AxiomError.Incompatible = function(type, value) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 */
AxiomError.Interrupt = function() { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} type
 * @param {*} value
 */
AxiomError.Invalid = function(type, value) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} type
 */
AxiomError.Missing = function(type) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} type
 * @param {*} value
 */
AxiomError.NotFound = function(type, value) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} message
 */
AxiomError.NotImplemented = function(message) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 *
 * @param {string|Object} indexee
 * @param {number} index
 */
AxiomError.OutOfRange = function(indexee, index) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} reason
 * @param {*} value
 */
AxiomError.ParentClosed = function(reason, value) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} message
 * @param {number} position
 */
AxiomError.Parse = function(message, position) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} message
 */
AxiomError.Runtime = function(message) { this.init(arguments) };

/**
 * @constructor @extends{AxiomError}
 * @param {string} expectedType
 * @param {*} gotValue
 */
AxiomError.TypeMismatch = function(expectedType, gotValue) {
  this.init(arguments);
};

/**
 * @constructor @extends{AxiomError}
 * @param {*} value
 */
AxiomError.Unknown = function(value) { this.init(arguments) };

// NOTE(rginda): I wanted to be able to statically declare the above errors
// in a way that closure would understand, but also wanted to avoid lots of
// boilerplate repition of the error names.  So the constructors are set up
// first and then we search AxiomError properties for things starting in
// uppercase in order to turn them into "proper" subclasses of AxiomError.
for (var key in AxiomError) {
  if (/^[A-Z]/.test(key))
    AxiomError.subclass(AxiomError[key], key);
}
