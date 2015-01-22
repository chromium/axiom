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
 * @param {string} name
 * @param {*} value
 */
var AxiomError = function(name, value) {
  Error.call(this);

  // The Error ctor doesn't seem to apply the message argument correctly, so
  // we set it by hand instead.  The message property gives DevTools an
  // informative message to dump for uncaught exceptions.
  /** @const {string} */
  this.message = name + ': ' + JSON.stringify(value);

  // Similar with the stack property.
  /** @const {string} */
  this.stack = (new Error()).stack;

  /** @const {string} */
  this.errorName = name;

  /** @const {*} */
  this.errorValue = value;
};

export {AxiomError};
export default AxiomError;

/**
 * Subclass of a native Error.
 */
AxiomError.prototype = Object.create(Error.prototype);

/** @const {string} */ AxiomError.errorName = 'AxiomError';
/** @const {Array} */ AxiomError.argNames = [];

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

AxiomError.prototype.toString = function() {
  return 'AxiomError: ' + this.message;
};

/**
 * @param {Arguments} args
 */
AxiomError.prototype.init = function(args) {
  this.errorName = this.constructor.errorName
  var argNames = this.constructor.argNames;

  if (args.length != argNames.length) {
    throw new Error('Not enough arguments for error :' + this.errorName +
                    ', got: ' + args.length + ', expected: ' +
                    argNames.length);
  }

  this.errorValue = {};
  for (var i = 0; i < argNames.length; i++) {
    this.errorValue[argNames[i]] = args[i];
  }

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
 * @param {function(...)} ctor
 * @param {string=} opt_name
 */
AxiomError.subclass = function(ctor, opt_name) {
  var match = ctor.toString().match(/^function [^\(]*\(([^\)]*)\)/);
  if (!match)
    throw new Error('Error parsing AxiomError constructor: ' + ctor.toString());

  var /** Array<string> */ argNames = [];

  if (match[1])
    ctor.argNames = match[1].split(/\s*,\s*/);

  ctor.errorName = opt_name || ctor.name;
  ctor.test = AxiomError.test.bind(ctor);
};

AxiomError.subclasses({
  'Duplicate':
  /**
   * @constructor @extends{AxiomError}
   *
   * @param {string} type
   * @param {*} value
   */
  AxiomError.Duplicate = function(type, value) { this.init(arguments) },

  'Incompatible':
  /**
   * @constructor @extends{AxiomError}
   * @param {string} type
   * @param {*} value
   */
  AxiomError.Incompatible = function(type, value) { this.init(arguments) },

  'Interrupt':
  /**
   * @constructor @extends{AxiomError}
   */
  AxiomError.Interrupt = function() { this.init(arguments) },

  'Invalid':
  /**
   * @constructor @extends{AxiomError}
   * @param {string} type
   * @param {*} value
   */
  AxiomError.Invalid = function(type, value) { this.init(arguments) },

  'Missing':
  /**
   * @constructor @extends{AxiomError}
   * @param {string} type
   */
  AxiomError.Missing = function(type) { this.init(arguments) },

  'NotFound':
  /**
   * @constructor @extends{AxiomError}
   * @param {string} type
   * @param {*} value
   */
  AxiomError.NotFound = function(type, value) { this.init(arguments) },

  'NotImplemented':
  /**
   * @constructor @extends{AxiomError}
   * @param {string} message
   */
  AxiomError.NotImplemented = function(message) { this.init(arguments) },

  'ParentClosed':
  /**
   * @constructor @extends{AxiomError}
   * @param {string} reason
   * @param {*} value
   */
  AxiomError.ParentClosed = function(reason, value) { this.init(arguments) },

  'Runtime':
  /**
   * @constructor @extends{AxiomError}
   * @param {string} message
   */
  AxiomError.Runtime = function(message) { this.init(arguments) },

  'TypeMismatch':
  /**
   * @constructor @extends{AxiomError}
   * @param {string} expectedType
   * @param {*} gotValue
   */
  AxiomError.TypeMismatch = function(expectedType, gotValue) {
    this.init(arguments);
  },

  'Unknown':
  /**
   * @constructor @extends{AxiomError}
   * @param {*} value
   */
  AxiomError.Unknown = function(value) { this.init(arguments) },
});
