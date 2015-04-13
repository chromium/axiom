if (typeof define !== 'function' && typeof __axiomRequire__ !== 'function') {
  var define, __axiomRequire__, __axiomExport__;

  (function() {
    var registry = {}, seen = {};

    define = function(name, deps, callback) {
      registry[name] = { deps: deps, callback: callback };
    };

    __axiomRequire__ = function(name, opt_fromList) {
      if (seen[name]) { return seen[name]; }
      var fromList = opt_fromList || [];

      var mod = registry[name];

      if (!mod) {
        throw new Error("Module: '" + name +
                        "' not found, referenced from: " +
                        fromList[fromList.length - 1]);
      }

      var deps = mod.deps,
      callback = mod.callback,
      reified = [],
      exports;

      fromList.push(name);

      for (var i = 0, l = deps.length; i<l; i++) {
        if (deps[i] === 'exports') {
          reified.push(exports = {});
        } else {
          if (fromList.indexOf(deps[i]) != -1)
            throw new Error('Circular dependency: ' + name + ' -> ' + deps[i]);
          reified.push(__axiomRequire__(deps[i], fromList));
        }
      }

      fromList.pop(name);

      var value = callback.apply(this, reified);

      return seen[name] = exports || value;
    };

    function makeGlobals(global) {
      var createdModules = {};
      var root = global;

      function ensureModule(moduleName) {
        var current = root;
        var names = moduleName.split('/');
        // Ensure parent modules are created
        for (var i = 0; i < names.length; i++) {
          var childName = names[i];
          var child = current[childName];
          if (!child) {
            child = current[childName] = {};
          }
          current = child;
        }
        return current;
      }

      for (var name in registry) {
        var moduleGlobal = ensureModule(name);
        var exports = __axiomRequire__(name);
        for (var key in exports) {
          if (moduleGlobal.hasOwnProperty(key)) {
            throw new Error('Property "' + key + '" of module "' + name +
                            '" conflicts with submodule of same name.');
          }
          moduleGlobal[key] = exports[key];
        }
      }

      return root;
    }

    __axiomExport__ = function(opt_global) {
      if (!opt_global)
        opt_global = window;
      return makeGlobals(opt_global);
    };

    define.registry = registry;
    define.seen = seen;
  })();
}

// Copyright (c) 2015 Google Inc. All rights reserved.
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
 * @template T
 */
define("axiom/core/completer", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var Completer = function() {
    /** @type {function(T)} */
    this.resolve = function() {};

    /** @type {function(*)} */
    this.reject = function() {};

    /** @type {!Promise<T>} */
    this.promise = new Promise(
      function(/** function(T) */ resolve, /** function(*) */ reject) {
        this.resolve = resolve;
        this.reject = reject;
      }.bind(this));
  };

  __es6_export__("Completer", Completer);
  __es6_export__("default", Completer);
});

//# sourceMappingURL=completer.js.map
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

define(
  "axiom/core/ephemeral",
  ["axiom/core/error", "axiom/core/event", "axiom/core/completer", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$event$$,
    axiom$core$completer$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var AxiomEvent;
    AxiomEvent = axiom$core$event$$["default"];
    var Completer;
    Completer = axiom$core$completer$$["default"];
    var Ephemeral = function() {
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
      this.onClose = new AxiomEvent();

      this.reset();
    };

    __es6_export__("Ephemeral", Ephemeral);
    __es6_export__("default", Ephemeral);

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
          } else {
            this.readyState = Ephemeral.State.Error;
          }
          this.onClose.fire(this.closeReason, rejectValue);
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
        throw new AxiomError.Ephemeral('Ready', this.readyState);
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
  }
);

//# sourceMappingURL=ephemeral.js.map
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
 * @param {Arguments} args Argument names of this error instance.
 */
define("axiom/core/error", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

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

 __es6_export__("AxiomError", AxiomError);
 __es6_export__("default", AxiomError);

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
});

//# sourceMappingURL=error.js.map
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
define("axiom/core/event", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

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

  __es6_export__("AxiomEvent", AxiomEvent);
  __es6_export__("default", AxiomEvent);

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
   * @param {...} var_args
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
   * @param {Object=} opt_obj The optional |this| object to apply the function
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
   * @param {Object=} opt_obj The optional |this| object to apply the function
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
   * @param {Object=} opt_obj The optional |this| object passed when registering
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
});

//# sourceMappingURL=event.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/arguments",
  ["axiom/core/error", "exports"],
  function(axiom$core$error$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Arguments = function(signature, arg) {
      this.signature = signature;
      this.arg = arg;

      this.records = {};

      var key, record;

      for (key in this.signature) {
        var sigil = this.signature[key];

        var required = false;
        if (key.substr(0, 1) == '!') {
          required = true;
          key = key.substr(1);
        }

        var keyList = key.split('|');
        record = new Arguments.Record(required, keyList, sigil);
        this.records[keyList[0]] = record;
      }

      for (key in arg) {
        record = this.getRecord(key);
        if (record)
          record.setValue(arg[key]);
      }

      for (key in this.records) {
        record = this.records[key];
        if (record.required &&
            this.getValue(key, Arguments.NotSet) == Arguments.NotSet) {
          throw new AxiomError.Missing('argument: ' + record.name);
        }
      }
    };

    __es6_export__("Arguments", Arguments);
    __es6_export__("default", Arguments);

    /**
     * List of valid sigils.
     *
     * @type {string}
     */
    Arguments.sigils = '$@%?*';

    /**
     * Used to indicate an argument whose value has not been set, in a way that
     * doesn't clash with arguments that have been set to |undefined|.
     *
     * @type {Object}
     */
    Arguments.NotSet = {};

    /**
     * Return true if the value matches the sigil.
     *
     * @param {*} value
     * @param {string} sigil
     * @return {boolean}
     */
    Arguments.typeCheck = function(value, sigil) {
      if (sigil == '$' && typeof value == 'string')
        return true;

      if (sigil == '@' && typeof value == 'object' && 'length' in value)
        return true;

      if (sigil == '%' && typeof value == 'object' && 'hasOwnProperty' in this)
        return true;

      if (sigil == '?' && typeof value == 'boolean')
        return true;

      if (sigil == '*')
        return true;

      return false;
    };

    /**
     * @constructor
     * @param {boolean} required
     * @param {Array<string>} aliases
     * @param {string} sigil
     */
    Arguments.Record = function(required, aliases, sigil) {
      /**
       * @type {Array<string>}
       */
      this.aliases = aliases;

      /**
       * @type {string}
       */
      this.name = this.aliases[0];

      /**
       * @type {boolean}
       */
      this.required = required;

      if (this.name == '_' && sigil != '@')
        throw new AxiomError.Invalid('Invalid sigil for "_", expected "@"', sigil);

      if (!sigil || sigil.length != 1 ||
          Arguments.sigils.indexOf(sigil) == -1) {
        throw new AxiomError.Invalid('Invalid sigil for: ' + aliases.join('|'),
                                     sigil);
      }

      /**
       * @type {string}
       */
      this.sigil = sigil;

      /**
       * @type {*}
       */
      this.value = Arguments.NotSet;

    };

    /**
     * @param {*=} opt_defaultValue
     * @return {*}
     */
    Arguments.Record.prototype.getValue = function(opt_defaultValue) {
      if (this.value == Arguments.NotSet)
        return opt_defaultValue;

      return this.value;
    };

    /**
     * @param {string} name
     * @return {void}
     */
    Arguments.Record.prototype.setValue = function(value) {
      if (!Arguments.typeCheck(value, this.sigil))
        throw new AxiomError.TypeMismatch(this.sigil, value);

      this.value = value;
    };

    /**
     * @param {string} name
     * @return {*}
     */
    Arguments.prototype.getRecord = function(name) {
      if (name in this.records)
        return this.records[name];

      for (var key in this.records) {
        if (this.records[key].aliases.indexOf(name) != -1)
          return this.records[key];
      }

      return null;
    };

    /**
     * @param {string} name
     * @param {*=} opt_defaultValue
     * @return {*}
     */
    Arguments.prototype.getValue = function(name, opt_defaultValue) {
      var record = this.getRecord(name);
      if (!record)
        throw new AxiomError.NotFound('argument name', name);

      return record.getValue(opt_defaultValue);
    };

    /**
     * @param {string} name
     * @param {*} value
     * @return {void}
     */
    Arguments.prototype.setValue = function(name, value) {
      var record = this.getRecord(name);
      if (!record)
        throw new AxiomError.NotFound('argument name', name);

      return record.setValue(value);
    };
  }
);

//# sourceMappingURL=arguments.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/base/execute_context",
  ["axiom/core/error", "axiom/core/event", "axiom/core/ephemeral", "axiom/fs/stdio", "axiom/fs/nested_stdio", "axiom/fs/arguments", "axiom/fs/path", "axiom/fs/tty_state", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$event$$,
    axiom$core$ephemeral$$,
    axiom$fs$stdio$$,
    axiom$fs$nested_stdio$$,
    axiom$fs$arguments$$,
    axiom$fs$path$$,
    axiom$fs$tty_state$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var AxiomEvent;
    AxiomEvent = axiom$core$event$$["default"];
    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];
    var Stdio;
    Stdio = axiom$fs$stdio$$["default"];
    var NestedStdio;
    NestedStdio = axiom$fs$nested_stdio$$["default"];
    var Arguments;
    Arguments = axiom$fs$arguments$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var TTYState;
    TTYState = axiom$fs$tty_state$$["default"];

    /** @typedef FileSystem$$module$axiom$fs$base$file_system */
    var FileSystem;

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    /** @typedef OpenContext$$module$axiom$fs$base$open_context */
    var OpenContext;

    /** @typedef OpenMode$$module$axiom$fs$open_mode */
    var OpenMode;

    /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
    var ReadableStream;

    /** @typedef {{name: string, value: *}} */
    var Signal;

    /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
    var WritableStream;

    var ExecuteContext = function(fileSystem, stdio, path, args) {
      Ephemeral.call(this);

      if (!args || !(args instanceof Arguments))
        throw new AxiomError.Missing('arguments');

      /**
       * @type {!FileSystem} Parent file system.
       */
      this.fileSystem = fileSystem;

      /**
       * @type {!FileSystemManager} Parent file system.
       */
      this.fileSystemManager = fileSystem.fileSystemManager;

      /**
       * @type {Path} The path we're supposed to execute.
       */
      this.path = path;

      /**
       * @type {Arguments} The argument to pass to the executable.
       */
      this.args = args;

      // If the parent file system is closed, we close too.
      this.dependsOn(this.fileSystem);

      /**
       * The ExecuteContext we're currently calling out to, if any.
       *
       * See setCallee().
       *
       * @type {ExecuteContext}
       */
      this.callee = null;

      /** @type {!Stdio} */
      this.stdio = stdio;
      /** @type {!ReadableStream} */
      this.stdin = stdio.stdin;
      /** @type {!WritableStream} */
      this.stdout = stdio.stdout;
      /** @type {!WritableStream} */
      this.stderr = stdio.stderr;
      /** @type {!ReadableStream} */
      this.signal = stdio.signal;
      /** @type {!ReadableStream} */
      this.ttyin = stdio.ttyin;
      /** @type {!WritableStream} */
      this.ttyout = stdio.ttyout;

      /** @type {!AxiomEvent} */
      this.onTTYRequest = new AxiomEvent();

      /**
       * The environtment variables for this execute context.
       * @private @type {Object<string, *>}
       */
      this.env_ = {};

      /**
       * The tty state for this execute context.
       * @private @type {!TTYState}
       */
      this.tty_ = new TTYState();
    };

    __es6_export__("ExecuteContext", ExecuteContext);
    __es6_export__("default", ExecuteContext);

    ExecuteContext.prototype = Object.create(Ephemeral.prototype);

    /**
     * @param {string} name
     * @param {*=} opt_defaultValue
     * @return {?}
     */
    ExecuteContext.prototype.getArg = function (name, opt_defaultValue) {
      return this.args.getValue(name, opt_defaultValue);
    };

    /**
     * @return {string}
     */
    ExecuteContext.prototype.getPwd = function() {
      return this.getEnv('$PWD',
                         this.fileSystemManager.defaultFileSystem.rootPath.spec);
    };

    /**
     * Initiate the execute.
     *
     * Returns a promise that completes when the execution is complete.
     *
     * @return {!Promise<*>}
     */
    ExecuteContext.prototype.execute = function() {
      this.assertEphemeral('Wait');
      return this.ephemeralPromise;
    };

    /**
     * Set the given ExecuteContext as the callee for this instance.
     *
     * When calling another executable, incoming calls and outbound events are
     * wired up to the caller as appropriate.  This instance will not receive
     * the stdio-like events while a call is in progress.  The onSignal event,
     * however, is delivered to this instance even when a call is in progress.
     *
     * If the callee is closed, events are rerouted back to this instance and the
     * callee instance property is set to null.
     *
     * @param {ExecuteContext} executeContext
     * @return {void}
     */
    ExecuteContext.prototype.setCallee = function(executeContext) {
      if (this.callee)
        throw new AxiomError.Runtime('Call in progress');

      this.callee = executeContext;
      var previousInterruptChar = this.tty_.getInterrupt();

      var nestedStdio = new NestedStdio(this.callee.stdio);
      this.callee.setStdio(nestedStdio);

      var onClose = function() {
        nestedStdio.close();
        this.callee.setStdio(nestedStdio.parentStdio);
        this.callee.onTTYRequest.removeListener(this.onTTYRequest.fire);
        this.callee = null;

        if (this.tty_.getInterrupt() != previousInterruptChar)
          this.requestTTY({interrupt: previousInterruptChar});
      }.bind(this);

      this.callee.onClose.listenOnce(onClose);
      this.callee.onTTYRequest.addListener(this.onTTYRequest.fire);
      this.callee.setEnvs(this.env_);
      this.callee.setTTY_(this.tty_);
    };

    /**
     * @param {!Stdio} stdio
     * @return {void}
     */
    ExecuteContext.prototype.setStdio = function(stdio) {
      this.stdio = stdio;
      this.stdin = stdio.stdin;
      this.stdout = stdio.stdout;
      this.stderr = stdio.stderr;
      this.signal = stdio.signal;
      this.ttyin = stdio.ttyin;
      this.ttyout = stdio.ttyout;
    };

    /**
     * Utility method to construct a new ExecuteContext, set it as the callee, and
     * execute it with the given path and arg.
     *
     * @param {!FileSystemManager} fileSystemManager
     * @param {!Path} path
     * @param {Object} arg
     * @return {!Promise<*>}
     */
    ExecuteContext.prototype.call = function(fileSystemManager, path, arg) {
      return fileSystemManager.createExecuteContext(path, this.stdio, arg).then(
        function(cx) {
          this.setCallee(cx);
          return cx.execute();
        }.bind(this));
    };

    /**
     * Return a copy of the internal tty state.
     * @return {TTYState}
     */
    ExecuteContext.prototype.getTTY = function() {
      return this.tty_.clone();
    };

    /**
     * Set the authoritative state of the tty.
     *
     * This should only be invoked in the direction of tty->executable.  Calls in
     * the reverse direction will only affect this instance and those derived (via
     * setCallee) from it, and will be overwritten the next time the authoritative
     * state changes.
     *
     * Executables should use requestTTY to request changes to the authoritative
     * state.
     *
     * @private
     * @param {TTYState|Object} tty
     * @return {void}
     */
    ExecuteContext.prototype.setTTY_ = function(tty) {
      this.assertEphemeral('Wait', 'Ready');

      this.tty_.copyFrom(tty);

      if (this.callee)
        this.callee.setTTY_(tty);
    };

    /**
     * @private
     *
     * Return a by-value copy of the given value.
     *
     * @param {*} v
     * @return {*}
     */
    ExecuteContext.prototype.copyValue_ = function(v) {
      if (v instanceof Object)
        return JSON.parse(JSON.stringify(v));

      return v;
    };

    /**
     * Request a change to the controlling tty.
     *
     * At the moment only the 'interrupt' property can be changed.
     *
     * @param {Object} tty An object containing a changeable property of the
     *   tty.
     * @return {void}
     */
    ExecuteContext.prototype.requestTTY = function(tty) {
      this.assertEphemeral('Ready');

      if (typeof tty.interrupt == 'string')
        this.onTTYRequest.fire({interrupt: tty.interrupt});
    };

    /**
     * Get a copy of the current environment variables.
     *
     * @return {*}
     */
    ExecuteContext.prototype.getEnvs = function() {
      return this.copyValue_(this.env_);
    };

    /**
     * Get the value of the given environment variable, or the provided
     * defaultValue if it is not set.
     *
     * @param {string} name
     * @param {*=} opt_defaultValue
     * return {*}
     */
    ExecuteContext.prototype.getEnv = function(name, opt_defaultValue) {
      if (this.env_.hasOwnProperty(name))
        return this.copyValue_(this.env_[name]);

      return opt_defaultValue;
    };

    /**
     * Overwrite the current environment.
     *
     * @param {Object} env
     * @return {void}
     */
    ExecuteContext.prototype.setEnvs = function(env) {
      this.assertEphemeral('Wait', 'Ready');
      for (var key in env) {
        this.setEnv(key, this.copyValue_(env[key]));
      }
    };

    /**
     * Set the given environment variable.
     *
     * @param {string} name
     * @param {*} value
     * @return {void}
     */
    ExecuteContext.prototype.setEnv = function(name, value) {
      this.assertEphemeral('Wait', 'Ready');
      this.env_[name] = this.copyValue_(value);
    };

    /**
     * Remove the given environment variable.
     *
     * @param {string} name
     * @return {void}
     */
    ExecuteContext.prototype.delEnv = function(name) {
      this.assertEphemeral('Wait', 'Ready');
      delete this.env_[name];
    };

    /**
     * Create a new execute context using the fs.FileSystem for this execute
     * context, bound to the lifetime of this context.
     *
     * @param {!Path} path
     * @param {Object} arg
     * @return {Promise<ExecuteContext>}
     */
    ExecuteContext.prototype.createExecuteContext = function(path, arg) {
      return this.fileSystemManager.createExecuteContext(
          path, this.stdio, arg).then(
        function(cx) {
          cx.dependsOn(this);
          return cx;
        }.bind(this));
    };

    /**
     * Create a new open context using the fs.FileSystem for this execute
     * context, bound to the lifetime of this context.
     *
     * @param {Path} path
     * @param {OpenMode} mode
     * @return {Promise<OpenContext>}
     */
    ExecuteContext.prototype.createOpenContext = function(path, mode) {
      return this.fileSystemManager.createOpenContext(path, mode).then(
        function(cx) {
          cx.dependsOn(this);
          return cx;
        }.bind(this));
    };

    /**
     * Dispatch a signal to this execution context and callee.
     *
     * @param {!Signal} signal
     * @return {void}
     */
    ExecuteContext.prototype.dispatchSignal = function(signal) {
      if (signal.name === 'tty-change') {
        this.setTTY_(/** @type {Object} */(signal.value));
        return;
      }

      if (signal.name === 'interrupt') {
        // Interrupt goes to the deepest callee
        if (this.callee) {
          this.callee.dispatchSignal(signal);
          return;
        }

        this.closeError(new AxiomError.Interrupt());
        return;
      }
    };
  }
);

//# sourceMappingURL=execute_context.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/base/file_system",
  ["axiom/core/error", "axiom/core/ephemeral", "axiom/fs/base/open_context", "axiom/fs/stdio", "axiom/fs/path", "axiom/fs/seek_whence", "axiom/fs/data_type", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$ephemeral$$,
    axiom$fs$base$open_context$$,
    axiom$fs$stdio$$,
    axiom$fs$path$$,
    axiom$fs$seek_whence$$,
    axiom$fs$data_type$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];
    var Stdio;
    Stdio = axiom$fs$stdio$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var SeekWhence;
    SeekWhence = axiom$fs$seek_whence$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];

    /** @typedef {Arguments$$module$axiom$fs$arguments} */
    var Arguments;

    /** @typedef {ExecuteContext$$module$axiom$fs$base$execute_context} */
    var ExecuteContext;

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    /** @typedef {OpenMode$$module$axiom$fs$open_mode} */
    var OpenMode;

    /** @typedef {ReadResult$$module$axiom$fs$read_result} */
    var ReadResult;

    /** @typedef {WriteResult$$module$axiom$fs$write_result} */
    var WriteResult;

    /** @typedef {StatResult$$module$axiom$fs$stat_result} */
    var StatResult;

    var abstract = function() { throw new AxiomError.AbstractCall() };

    var FileSystem = function(fileSystemManager, name) {
      Ephemeral.call(this);

      /** @type {!FileSystemManager} */
      this.fileSystemManager = fileSystemManager;

      /** @type {!string} */
      this.name = name;

      /** @type {!string} */
      this.description = name;

      /** @type {!Path} */
      this.rootPath = new Path(name + Path.rootSeparator);
    };

    __es6_export__("FileSystem", FileSystem);
    __es6_export__("default", FileSystem);

    FileSystem.prototype = Object.create(Ephemeral.prototype);

    /**
     * Create an alias from a path on this file system to a different path on this
     * file system.
     *
     * If the "from" path is on a different fs, we'll forward the call.  If "from"
     * is on this fs but "to" is not, the move will fail.
     *
     * The destination path must refer to a file that does not yet exist, inside a
     * directory that does.
     *
     * @param {Path} pathFrom
     * @param {Path} pathTo
     * @return {!Promise<undefined>}
     */
    FileSystem.prototype.alias = function(pathFrom, pathTo) {
      abstract();
    };

    /**
     * @param {!Path} path
     * @param {!Stdio} stdio
     * @param {Object|Arguments} arg
     * @return {!Promise<!ExecuteContext>}
     */
    FileSystem.prototype.createExecuteContext = function(path, stdio, arg) {
      abstract();
    };

    /**
     * @param {Path} path
     * @param {string|OpenMode} mode
     * @return {!Promise<!OpenContext>}
     */
    FileSystem.prototype.createOpenContext = function(path, mode) {
      abstract();
    };

    /**
     * @param {Path} path
     * @return {!Promise<!Object<string, StatResult>>}
     */
    FileSystem.prototype.list = function(path) {
      abstract();
    };

    /**
     * @param {Path} path
     * @return {!Promise<undefined>}
     */
    FileSystem.prototype.mkdir = function(path) {
      abstract();
    };

    /**
     * Move an entry from a path on a file system to a different path on the
     * same file system.
     *
     * The destination path must refer to a file that does not yet exist, inside a
     * directory that does.
     *
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    FileSystem.prototype.copy = function(fromPath, toPath) {
      return this.readFile(fromPath)
        .then(function(readResult) {
          return this.writeFile(toPath, readResult.dataType, readResult.data);
        }.bind(this));
    };

    /**
     * Move an entry from a path on a file system to a different path on the
     * same file system.
     *
     * The destination path must refer to a file that does not yet exist, inside a
     * directory that does.
     *
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    FileSystem.prototype.move = function(fromPath, toPath) {
      return this.readFile(fromPath)
        .then(function(readResult) {
          return this.writeFile(toPath, readResult.dataType, readResult.data);
        }.bind(this))
        .then(function() {
          return this.unlink(fromPath);
        }.bind(this));
    };

    /**
     * @param {Path} path
     * @return {!Promise<!StatResult>}
     */
    FileSystem.prototype.stat = function(path) {
      abstract();
    };

    /**
     * Remove the given path.
     *
     * @param {Path} path
     * @return {Promise}
     */
    FileSystem.prototype.unlink = function(path) {
      abstract();
    };

    /**
     * Read the entire contents of a file.
     *
     * This is a utility method that creates an OpenContext, uses the read
     * method to read in the entire file (by default) and then discards the
     * open context.
     *
     * By default this will return the data in the dataType preferred by the
     * file. You can request a specific dataType by including it in readArg.
     *
     * @param {Path} path The path to read from.
     * @param {DataType=} opt_dataType
     * @param {(string|OpenMode)=} opt_openMode
     * @param {number=} opt_offset
     * @param {SeekWhence=} opt_whence
     * @return {!Promise<!ReadResult>}
     */
    FileSystem.prototype.readFile = function(
        path, opt_dataType, opt_openMode, opt_offset, opt_whence) {
      var openMode = opt_openMode || 'r';
      var dataType = opt_dataType || DataType.UTF8String;
      var offset = opt_offset || 0;
      var whence = opt_whence || SeekWhence.Begin;

      return this.createOpenContext(path, openMode).then(
          function(cx) {
            return cx.open().then(function() {
              return cx.read(offset, whence, dataType);
            });
      });
    };

    /**
     * Write the entire contents of a file.
     *
     * This is a utility method that creates an OpenContext, uses the write
     * method to write the entire file (by default) and then discards the
     * open context.
     *
     * @param {Path} path The path to write to.
     * @param {DataType=} opt_dataType
     * @param {*} data
     * @param {(string|OpenMode)=} opt_openMode
     * @param {number=} opt_offset
     * @param {SeekWhence=} opt_whence
     * @return {!Promise<!WriteResult>}
     */
    FileSystem.prototype.writeFile = function(
        path, dataType, data, opt_openMode, opt_offset, opt_whence) {
      var openMode = opt_openMode || 'wtc';
      var offset = opt_offset || 0;
      var whence = opt_whence || SeekWhence.Begin;

      return this.createOpenContext(path, openMode).then(
          function(cx) {
            return cx.open().then(function() {
              return cx.write(offset, whence, dataType, data);
            });
      });
    };

    /**
     * Returns a {Path} relative to this filesystem with given path
     *
     * @param {string} String path with which to construct {Path}
     * @return {Path} The Path in current root.
     */
    FileSystem.prototype.getPath = function(path) {
      var rootName = this.name + Path.rootSeparator;
      return new Path(rootName + path);
    };

    /**
     * Installs an object of callback executables into /exe.
     *
     * @param {Object<string, function(JsExecuteContext)>} executables
     * @return {void}
     */
    FileSystem.prototype.install = function(obj) {
      abstract();
    };
  }
);

//# sourceMappingURL=file_system.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/base/file_system_manager",
  ["axiom/core/error", "axiom/core/ephemeral", "axiom/fs/base/open_context", "axiom/fs/base/file_system", "axiom/fs/stdio", "axiom/fs/path", "axiom/fs/seek_whence", "axiom/fs/data_type", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$ephemeral$$,
    axiom$fs$base$open_context$$,
    axiom$fs$base$file_system$$,
    axiom$fs$stdio$$,
    axiom$fs$path$$,
    axiom$fs$seek_whence$$,
    axiom$fs$data_type$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];
    var FileSystem;
    FileSystem = axiom$fs$base$file_system$$["default"];
    var Stdio;
    Stdio = axiom$fs$stdio$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var SeekWhence;
    SeekWhence = axiom$fs$seek_whence$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];

    /** @typedef {ExecuteContext$$module$axiom$fs$base$execute_context} */
    var ExecuteContext;

    /** @typedef {OpenMode$$module$axiom$fs$open_mode} */
    var OpenMode;

    /** @typedef {ReadResult$$module$axiom$fs$read_result} */
    var ReadResult;

    /** @typedef {WriteResult$$module$axiom$fs$write_result} */
    var WriteResult;

    /** @typedef {StatResult$$module$axiom$fs$stat_result} */
    var StatResult;

    var FileSystemManager = function() {
      FileSystem.call(this, this, '');

      /**
       * The known file systems, by name.
       * @private
       * @type {!Object<string, FileSystem>}
       */
      this.fileSystems_ = {};

      /**
       * The "default" file system, i.e. the first file system mounted.
       * @type {FileSystem}}
       */
      this.defaultFileSystem = null;
    };

    __es6_export__("FileSystemManager", FileSystemManager);
    __es6_export__("default", FileSystemManager);

    FileSystemManager.prototype = Object.create(FileSystem.prototype);

    /**
     * Return the file system instance identified by the given path.
     * Throws an error if the file system does not exist.
     *
     * @private
     * @param {Path} path
     * @return {FileSystem}
     */
    FileSystemManager.prototype.getFileSystem_ = function(path) {
      if (!this.fileSystems_.hasOwnProperty(path.root)) {
        throw new AxiomError.NotFound('filesystem-name', path.root);
      }

      return this.fileSystems_[path.root];
    };

    /**
     * Return the list of currently mounted file systems.
     *
     * @return {Array<FileSystem>}
     */
    FileSystemManager.prototype.getFileSystems = function() {
      var result = [];
      for(var key in this.fileSystems_) {
        result.push(this.fileSystems_[key]);
      }
      return result;
    };

    /**
     * Mount a file system. The file system must have a unique name.
     *
     * @param {!FileSystem} fileSystem
     * @return {void}
     */
    FileSystemManager.prototype.mount = function(fileSystem) {
      if (this.fileSystems_.hasOwnProperty(fileSystem.name)) {
        throw new AxiomError.Duplicate('filesystem-name', fileSystem.name);
      }

      this.fileSystems_[fileSystem.name] = fileSystem;
      if (!this.defaultFileSystem)
        this.defaultFileSystem = fileSystem;
    };

    /**
     * Create an alias from a path on this file system to a different path on this
     * file system.
     *
     * If the "from" path is on a different fs, we'll forward the call.  If "from"
     * is on this fs but "to" is not, the move will fail.
     *
     * The destination path must refer to a file that does not yet exist, inside a
     * directory that does.
     *
     * @override
     * @param {Path} pathFrom
     * @param {Path} pathTo
     * @return {!Promise<undefined>}
     */
    FileSystemManager.prototype.alias = function(pathFrom, pathTo) {
      var fileSystem = this.getFileSystem_(pathFrom);
      return fileSystem.alias(pathFrom, pathTo);
    };

    /**
     * @override
     * @param {!Path} path
     * @param {!Stdio} stdio
     * @param {Object} arg
     * @return {!Promise<!ExecuteContext>}
     */
    FileSystemManager.prototype.createExecuteContext = function(path, stdio, arg) {
      var fileSystem = this.getFileSystem_(path);
      return fileSystem.createExecuteContext(path, stdio, arg);
    };

    /**
     * @override
     * @param {Path} path
     * @param {string|OpenMode} mode
     * @return {!Promise<!OpenContext>}
     */
    FileSystemManager.prototype.createOpenContext = function(path, mode) {
      var fileSystem = this.getFileSystem_(path);
      return fileSystem.createOpenContext(path, mode);
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<!Object<string, StatResult>>}
     */
    FileSystemManager.prototype.list = function(path) {
      var fileSystem = this.getFileSystem_(path);
      return fileSystem.list(path);
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<undefined>}
     */
    FileSystemManager.prototype.mkdir = function(path) {
      var fileSystem = this.getFileSystem_(path);
      return fileSystem.mkdir(path);
    };

    /**
     * @private
     * @param {Path} fromPath
     * @param {Path} toPath
     * @param {isMove} Whether the operation to do is move (vs. copy).
     * @return {!Promise<undefined>}
     */
    FileSystemManager.prototype.copyOrMove_ = function(fromPath, toPath, isMove) {
      var fromFs = this.getFileSystem_(fromPath);
      var toFs = this.getFileSystem_(toPath);
      var promise;
      if (fromFs == toFs) {
        promise = isMove ? 
            fromFs.move(fromPath, toPath) : 
            fromFs.copy(fromPath, toPath);
      } else {
        promise = fromFs.readFile(fromPath)
          .then(function(readResult) {
            return toFs.writeFile(toPath, readResult.dataType, readResult.data);
          })
          .then(function() {
            return isMove ? fromFs.unlink(fromPath) : Promise.resolve();
          });
      }
      return promise;
    };

    /**
     * Copy an entry from a path on a file system to a different path on the
     * same file system.
     *
     * The destination path must refer to a file that does not yet exist, inside a
     * directory that does.
     *
     * @override
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    FileSystemManager.prototype.copy = function(fromPath, toPath) {
      return this.copyOrMove_(fromPath, toPath, false);
    };

    /**
     * Move an entry from a path on a file system to a different path on the
     * same file system.
     *
     * The destination path must refer to a file that does not yet exist, inside a
     * directory that does.
     *
     * @override
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    FileSystemManager.prototype.move = function(fromPath, toPath) {
      return this.copyOrMove_(fromPath, toPath, true);
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<!StatResult>}
     */
    FileSystemManager.prototype.stat = function(path) {
      var fileSystem = this.getFileSystem_(path);
      return fileSystem.stat(path);
    };

    /**
     * Remove the given path.
     *
     * @override
     * @param {Path} path
     * @return {Promise}
     */
    FileSystemManager.prototype.unlink = function(path) {
      var fileSystem = this.getFileSystem_(path);
      return fileSystem.unlink(path);
    };

    /**
     * Installs a list of executables represented by an object into /exe.
     *
     * @param {Path} path
     * @param {*} An object with callback entries to be installed
     * @return {void}
     */
    FileSystemManager.prototype.install = function(obj) {
      this.defaultFileSystem.install(obj);
    };
  }
);

//# sourceMappingURL=file_system_manager.js.map
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

define(
  "axiom/fs/base/open_context",
  ["axiom/core/completer", "axiom/core/ephemeral", "axiom/core/error", "axiom/core/event", "axiom/fs/open_mode", "axiom/fs/path", "axiom/fs/read_result", "axiom/fs/write_result", "exports"],
  function(
    axiom$core$completer$$,
    axiom$core$ephemeral$$,
    axiom$core$error$$,
    axiom$core$event$$,
    axiom$fs$open_mode$$,
    axiom$fs$path$$,
    axiom$fs$read_result$$,
    axiom$fs$write_result$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var Completer;
    Completer = axiom$core$completer$$["default"];
    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];
    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var AxiomEvent;
    AxiomEvent = axiom$core$event$$["default"];
    var OpenMode;
    OpenMode = axiom$fs$open_mode$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var ReadResult;
    ReadResult = axiom$fs$read_result$$["default"];
    var WriteResult;
    WriteResult = axiom$fs$write_result$$["default"];

    /** @typedef {DataType$$module$axiom$fs$data_type} */
    var DataType;

    /** @typedef {FileSystem$$module$axiom$fs$base$file_system} */
    var FileSystem;

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    /** @typedef {SeekWhence$$module$axiom$fs$seek_whence} */
    var SeekWhence;

    var OpenContext = function(fileSystem, path, mode) {
      Ephemeral.call(this);

      /** @type {!FileSystem} */
      this.fileSystem = fileSystem;

      /** @type {!FileSystemManager} */
      this.fileSystemManager = fileSystem.fileSystemManager;

      /** @type {Path} */
      this.path = path;

      if (typeof mode == 'string')
        mode = OpenMode.fromString(mode);

      /** @type {OpenMode} */
      this.mode = mode;

      // If the parent file system is closed, we close too.
      this.dependsOn(this.fileSystem);

      /**
       * @private @type {Completer}
       */
      this.openCompleter_ = null;
    };

    __es6_export__("OpenContext", OpenContext);
    __es6_export__("default", OpenContext);

    OpenContext.prototype = Object.create(Ephemeral.prototype);

    /**
     * Initiate the open.
     *
     * Returns a promise that completes when the context is ready for
     * read/write/seek operations.
     *
     * Implementers are responsible for setting the "ready" state when
     * "open" is done.
     *
     * @return {!Promise<undefined>}
     */
    OpenContext.prototype.open = function() {
      this.assertEphemeral('Wait');
      return Promise.resolve();
    };

    /**
     * Returns a promise that completes when the "seek" operation is done.
     *
     * @param {number} offset
     * @param {SeekWhence} whence
     * @return {!Promise<undefined>}
     */
    OpenContext.prototype.seek = function(offset, whence) {
      this.assertEphemeral('Ready');
      return Promise.resolve();
    };

    /**
     * Returns a promise that completes when the "read" operation is done.
     *
     * @param {number} offset
     * @param {SeekWhence} whence
     * @param {?DataType} dataType
     * @return {!Promise<!ReadResult>}
     */
    OpenContext.prototype.read = function(offset, whence, dataType) {
      this.assertEphemeral('Ready');
      if (!this.mode.read)
        return Promise.reject(new AxiomError.Invalid('mode.read', this.mode.read));

      return Promise.resolve(new ReadResult(offset, whence, dataType));
    };

    /**
     * Returns a promise that completes when the "write" operation is done.
     *
     * @param {number} offset
     * @param {SeekWhence} whence
     * @param {?DataType} dataType
     * @param {*} data
     * @return {!Promise<!WriteResult>}
     */
    OpenContext.prototype.write = function(offset, whence, dataType, data) {
      this.assertEphemeral('Ready');
      if (!this.mode.write) {
        return Promise.reject(new AxiomError.Invalid('mode.write',
                                                     this.mode.write));
      }

      return Promise.resolve(new WriteResult(offset, whence, dataType));
    };
  }
);

//# sourceMappingURL=open_context.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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
 * @enum {string}
 *
 * List of acceptable values for the 'dataType' parameter used in stat and read
 * operations.
 */
define("axiom/fs/data_type", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

 var DataType = {
   /**
    * When a dataType of 'arraybuffer' is used on read and write requests, the
    * data is expected to be an ArrayBuffer instance.
    *
    * NOTE(rginda): ArrayBuffer objects don't work over chrome.runtime ports,
    * due to http://crbug.com/374454.
    */
   ArrayBuffer: 'arraybuffer',

   /**
    * When used in read and write requests, the data will be a base64 encoded
    * string.  Note that decoding this value to a UTF8 string may result in
    * invalid UTF8 sequences or data corruption.
    */
   Base64String: 'base64-string',

   /**
    * In stat results, a dataType of 'blob' means that the file contains a set
    * of random access bytes.
    *
    * When a dataType of 'blob' is used on a read request, the data is expected
    * to be an instance of an opened Blob object.
    *
    * NOTE(rginda): Blobs can't cross origin over chrome.runtime ports.
    * Need to test over HTML5 MessageChannels.
    */
   Blob: 'blob',

   /**
    * Not used in stat results.
    *
    * When used in read and write requests, the data will be a UTF-8
    * string.  Note that if the underlying file contains sequences that cannot
    * be encoded in UTF-8, the result may contain invalid sequences or may
    * not match the actual contents of the file.
    */
   UTF8String: 'utf8-string',

   /**
    * In stat results, a dataType of 'value' means that the file contains a
    * single value which can be of any type.
    *
    * When an dataType of 'value' is used on a read request, the results of
    * the read will be the native type stored in the file.  If the file
    * natively stores a blob, the result will be a string.
    */
   Value: 'value'
 };

 __es6_export__("DataType", DataType);
 __es6_export__("default", DataType);
});

//# sourceMappingURL=data_type.js.map
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

define(
  "axiom/fs/dom/domfs_util",
  ["axiom/fs/path", "axiom/core/error", "exports"],
  function(axiom$fs$path$$, axiom$core$error$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var Path;
    Path = axiom$fs$path$$["default"];
    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var domfsUtil = {};
    __es6_export__("domfsUtil", domfsUtil);
    __es6_export__("default", domfsUtil);

    /**
     * @param {Path} path
     * @return {string}
     */
    domfsUtil.makeDomfsPath = function(path) {
      if (!path || !path.relSpec)
        return '/';

      return '/' + path.relSpec;
    };

    /**
     * Get an appropriate 'stat' value for the given HTML5 FileEntry or
     * DirEntry object.
     */
    domfsUtil.statEntry = function(entry) {
      return new Promise(function(resolve, reject) {
        var onMetadata = function(entry, metadata) {
          if (!metadata) {
            metadata = {modificationTime: 0, size: 0};
          }
          if (entry.isFile) {
            return resolve({
              dataType: 'blob',
              mode: Path.Mode.R | Path.Mode.W | Path.Mode.K,
              mtime: new Date(metadata.modificationTime).getTime(),
              size: metadata.size
            });
          } else {
            return resolve({
              mode: Path.Mode.R | Path.Mode.D,
              mtime: new Date(metadata.modificationTime).getTime(),
            });
          }
        };
        
        if ('getMetadata' in entry) {
          entry.getMetadata(
            onMetadata.bind(null, entry), 
            function(error) { 
              if (error.code === 1001) {
                // NOTE: getMetadata() is not implemented for directories in
                // idb.filesystem.js polyfill: it returns an error with this code.
                onMetadata(entry, null);
              } else {
                reject(error);
              }
            }
          );
        } else {
          reject(new AxiomError.Runtime('entry has no getMetadata'));
        }
      });
     };

    /**
     * List all FileEntrys in a given HTML5 directory.
     *
     * @param {DirectoryEntry} root The directory to consider as the root of the
     *     path.
     * @param {string} path The path of the target directory, relative to root.
     * @return {Promise<Object>}
     */
    domfsUtil.listDirectory = function(root, path) {
      return new Promise(function(resolve, reject) {
        var entries = {};
        var promises = [];
        var rv = {};
        var addResult = function(entry, statResult) {
          rv[entry.name] = statResult;
        };

        var onFileError = domfsUtil.rejectFileError.bind(null, path, reject);
        var onDirectoryFound = function(dirEntry) {
          var reader = dirEntry.createReader();
          reader.readEntries(function(entries) {
            for (var i = 0; i < entries.length; i++) {
              var promise = domfsUtil.statEntry(entries[i]);
              promises.push(promise.then(addResult.bind(null, entries[i])));
            }

            Promise.all(promises).then(function() {
              return resolve(rv);
            });
          }, onFileError);
        };
        root.getDirectory(path, {create: false}, onDirectoryFound, onFileError);
      });
    };

    domfsUtil.getFileOrDirectory = function(root, pathSpec) {
      return new Promise(function(resolve, reject) {
        var onFileFound = function(r) {
          return resolve(r);
        };

        var onError = function() {
           var onFileError = domfsUtil.rejectFileError.bind(null, pathSpec, reject);
           root.getDirectory(pathSpec, {create: false}, onFileFound, onFileError);
        };

        root.getFile(pathSpec, {create: false}, onFileFound, onError);
      });
    };

    /**
     * Removes all files and sub directories for a given path.
     */
    domfsUtil.remove = function(root, path) {
      return new Promise(function(resolve, reject) {
        return domfsUtil.getFileOrDirectory(root, path).then(function(r) {
          if (r.isDirectory === false) {
            r.remove(resolve, reject);
          } else {
            r.removeRecursively(resolve, reject);
          }
        }).catch(function(e) {
          return reject(e);
        });
      });
    };

    /**
     * Create a directory with a given name under root.
     */
    domfsUtil.mkdir = function(root, name) {
      return new Promise(function(resolve, reject) {
        var onError = domfsUtil.rejectFileError.bind(null, name, reject);
        root.getDirectory(name, {create: true, exclusive: true}, resolve, onError);
      });
    };

    /**
     * Convenience method to convert a FileError to a promise rejection with an
     * Axiom error.
     *
     * Used in the context of a FileEntry.
     */
    domfsUtil.convertFileError = function(pathSpec, error) {
      if (error.name == 'TypeMismatchError')
        return new AxiomError.TypeMismatch('entry-type', pathSpec);

      if (error.name == 'NotFoundError')
        return new AxiomError.NotFound('path', pathSpec);

      if (error.name == 'PathExistsError')
        return new AxiomError.Duplicate('path', pathSpec);

      return new AxiomError.Runtime(pathSpec + ':' + error.toString());
    };

    domfsUtil.rejectFileError = function(pathSpec, reject, error) {
      reject(domfsUtil.convertFileError(pathSpec, error));
    };
  }
);

//# sourceMappingURL=domfs_util.js.map
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

define(
  "axiom/fs/dom/execute_context",
  ["axiom/core/error", "axiom/fs/base/execute_context", "axiom/fs/stdio", "axiom/fs/path", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$base$execute_context$$,
    axiom$fs$stdio$$,
    axiom$fs$path$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var ExecuteContext;
    ExecuteContext = axiom$fs$base$execute_context$$["default"];
    var Stdio;
    Stdio = axiom$fs$stdio$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef {Arguments$$module$axiom$fs$arguments} */
    var Arguments;

    /** @typedef DomFileSystem$$module$axiom$fs$dom$file_system */
    var DomFileSystem;

    var DomExecuteContext = function(domfs, stdio, path, arg) {
      this.domfs = domfs;
      this.stdio = stdio;
      this.path = path;
      this.arg = arg;
    };

    __es6_export__("DomExecuteContext", DomExecuteContext);
    __es6_export__("default", DomExecuteContext);

    DomExecuteContext.prototype.execute_ = function() {
      return Promise.reject(new AxiomError.NotImplemented(
          'DOM filesystem is not executable.'));
    };
  }
);

//# sourceMappingURL=execute_context.js.map
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

define(
  "axiom/fs/dom/file_system",
  ["axiom/core/error", "axiom/fs/path", "axiom/fs/base/execute_context", "axiom/fs/base/file_system", "axiom/fs/base/file_system_manager", "axiom/fs/stdio", "axiom/fs/js/directory", "axiom/fs/dom/execute_context", "axiom/fs/dom/open_context", "axiom/fs/js/resolve_result", "axiom/fs/dom/domfs_util", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$path$$,
    axiom$fs$base$execute_context$$,
    axiom$fs$base$file_system$$,
    axiom$fs$base$file_system_manager$$,
    axiom$fs$stdio$$,
    axiom$fs$js$directory$$,
    axiom$fs$dom$execute_context$$,
    axiom$fs$dom$open_context$$,
    axiom$fs$js$resolve_result$$,
    axiom$fs$dom$domfs_util$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var ExecuteContext;
    ExecuteContext = axiom$fs$base$execute_context$$["default"];
    var FileSystem;
    FileSystem = axiom$fs$base$file_system$$["default"];
    var FileSystemManager;
    FileSystemManager = axiom$fs$base$file_system_manager$$["default"];
    var Stdio;
    Stdio = axiom$fs$stdio$$["default"];
    var JsDirectory;
    JsDirectory = axiom$fs$js$directory$$["default"];
    var DomExecuteContext;
    DomExecuteContext = axiom$fs$dom$execute_context$$["default"];
    var DomOpenContext;
    DomOpenContext = axiom$fs$dom$open_context$$["default"];
    var JsResolveResult;
    JsResolveResult = axiom$fs$js$resolve_result$$["default"];
    var domfsUtil;
    domfsUtil = axiom$fs$dom$domfs_util$$["default"];

    /** @typedef OpenContext$$module$axiom$fs$base$open_context */
    var OpenContext;

    /** @typedef OpenMode$$module$axiom$fs$open_mode */
    var OpenMode;

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    var DomFileSystem = function(fileSystemManager, name, fileSystem, type) {
      FileSystem.call(this, fileSystemManager, name);

      /** @type {?} */
      this.fileSystem = fileSystem;

      /** @type {string} */
      this.description = 'html5 file system (' + type + ')';
    };

    __es6_export__("DomFileSystem", DomFileSystem);
    __es6_export__("default", DomFileSystem);

    DomFileSystem.prototype = Object.create(FileSystem.prototype);

    DomFileSystem.available = function() {
      return !!(window.requestFileSystem || window.webkitRequestFileSystem);
    };

    /**
     * Mounts a given type if dom filesystem at /jsDir/mountName
     *
     * @param {!FileSystemManager} fileSystemManager
     * @param {!string} fileSystemName
     * @param {!string} type  File system type: 'temporary' or 'permanent'.
     * @return {Promise<DomFileSystem!>}
     */
    DomFileSystem.mount = function(fileSystemManager, fileSystemName, type) {
      return new Promise(function(resolve, reject) {
        var requestFs = (window.requestFileSystem ||
                         window.webkitRequestFileSystem).bind(window);

        if (!requestFs) {
          return reject(new AxiomError.Runtime('HTML5 file system unavailable'));
        }

        var capacity = 1024 * 1024 * 1024;

        var onFileSystemFound = function(fs) {
          var domfs =
              new DomFileSystem(fileSystemManager, fileSystemName, fs, type);
          fileSystemManager.mount(domfs);
          return resolve(domfs);
        };

        var onFileSystemError = function(e) {
          reject(new AxiomError.Runtime(e));
        };

        var storageType;
        var webkitStorage;

        if (type === 'temporary') {
          storageType = window.TEMPORARY;
          webkitStorage = navigator['webkitTemporaryStorage'];
        } else {
          storageType = window.PERSISTENT;
          webkitStorage = navigator['webkitPersistentStorage'];
        }
        
        // requestQuota is specific to Chrome: others don't have it.
        if (webkitStorage) {
          webkitStorage.requestQuota(capacity, function(bytes) {
              requestFs(storageType, bytes, onFileSystemFound, onFileSystemError);
            }, onFileSystemError);
        } else {
          requestFs(storageType, capacity, onFileSystemFound, onFileSystemError);
        }
      });
    };

    /**
     * @private
     * @param {Path} path
     * @return {!boolean}
     */
    DomFileSystem.prototype.isValidPath_ = function(path) {
      return !(!path || !path.isValid || path.root !== this.name);
    };

    /**
     * This method is not directly reachable through the FileSystemBinding.
     *
     * @param {Path} path
     * @return {Promise<JsResolveResult>}
     */
    DomFileSystem.prototype.resolve = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      //TODO(grv): resolve directories and read mode bits.
      var domfs = this.fileSystem;
      return new Promise(function(resolve, reject) {
        domfs.root.getFile(domfsUtil.makeDomfsPath(path), {create: true},
            resolve, reject);
      });
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<!StatResult>}
     */
    DomFileSystem.prototype.stat = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      return domfsUtil.getFileOrDirectory(this.fileSystem.root,
          domfsUtil.makeDomfsPath(path)).then(function(r) {
        return domfsUtil.statEntry(r);
      });
    };

    /**
     * This version of mkdir_ is attached to the FileSystemBinding to ensure that
     * the DomDirectory returned by `mkdir` doesn't leak through the binding.
     *
     * @param {Path} path
     * @return {Promise}
     */
    DomFileSystem.prototype.mkdir_ = function(path) {
      return this.mkdir(path).then(function() {
        return null;
      });
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<undefined>}
     */
    DomFileSystem.prototype.mkdir = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      return new Promise(function(resolve, reject) {
        var parentPath = path.getParentPath();
        var targetName = path.getBaseName();

        var onDirectoryFound = function(dir) {
          return domfsUtil.mkdir(dir, targetName).then(function(r) {
            return resolve(r);
          }).catch (function(e) {
            return reject(e);
          });
        };

        var onFileError =
            domfsUtil.rejectFileError.bind(null, path.relSpec, reject);

        this.fileSystem.root.getDirectory(domfsUtil.makeDomfsPath(parentPath),
            {create: false}, onDirectoryFound, onFileError);
      }.bind(this));
    };

    /**
     * Create an alias from a path on this file system to a different path on this
     * file system.
     *
     * If the "from" path is on a different fs, we'll forward the call.  If "from"
     * is on this fs but "to" is not, the move will fail.
     *
     * The destination path must refer to a file that does not yet exist, inside a
     * directory that does.
     *
     * @override
     * @param {Path} pathFrom
     * @param {Path} pathTo
     * @return {!Promise<undefined>}
     */
    DomFileSystem.prototype.alias = function(pathFrom, pathTo) {
      return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
    };

    /**
     * Move an entry from a path on this file system to a different path on this
     * file system.
     *
     * If the "from" path is on a different fs, we'll forward the call.  If "from"
     * is on this fs but "to" is not, the move will fail.
     *
     * The destination path must refer to a file that does not yet exist, inside a
     * directory that does.
     *
     * @override
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    DomFileSystem.prototype.move = function(fromPath, toPath) {
      return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
    };

    /**
     * @override
     * @param {Path} path
     * @return {Promise}
     */
    DomFileSystem.prototype.unlink = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      return new Promise(function(resolve, reject) {
        var parentPath = path.getParentPath();
        var targetName = path.getBaseName();

        var onDirectoryFound = function(dir) {
          return domfsUtil.remove(dir, targetName).then(function(r) {
            return resolve(r);
          }).catch (function(e) {
            return reject(e);
          });
        };

        var onFileError =
            domfsUtil.rejectFileError.bind(null, path.relSpec, reject);

        this.fileSystem.root.getDirectory(domfsUtil.makeDomfsPath(parentPath),
            {create: false}, onDirectoryFound, onFileError);
      }.bind(this));
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<!Object<string, StatResult>>}
     */
    DomFileSystem.prototype.list = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      return domfsUtil.listDirectory(this.fileSystem.root,
          domfsUtil.makeDomfsPath(path)).then(function(entries) {
        return Promise.resolve(entries);
      });
    };

    /**
     * @override
     * @param {!Path} path
     * @param {!Stdio} stdio
     * @param {Object} arg
     * @return {!Promise<!ExecuteContext>}
     */
    DomFileSystem.prototype.createExecuteContext = function(path, stdio, arg) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      /** @type {!ExecuteContext} */
      var cx = new DomExecuteContext(this, stdio, path, arg);
      return Promise.resolve(cx);
    };

    /**
     * @override
     * @param {Path} path
     * @param {string|OpenMode} mode
     * @return {!Promise<!OpenContext>}
     */
    DomFileSystem.prototype.createOpenContext = function(path, mode) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      /** @type {!OpenContext} */
      var cx = new DomOpenContext(this, path, mode);
      return Promise.resolve(cx);
    };

    /**
     * Installs an object of callback executables into /exe.
     *
     * @override
     * @param {Object<string, function(JsExecuteContext)>} executables
     * @return {void}
     */
    DomFileSystem.prototype.install = function(obj) {
      throw(new AxiomError.NotImplemented('To be implemented.'));
    };
  }
);

//# sourceMappingURL=file_system.js.map
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

define(
  "axiom/fs/dom/open_context",
  ["axiom/core/error", "axiom/fs/data_type", "axiom/fs/write_result", "axiom/fs/read_result", "axiom/fs/seek_whence", "axiom/fs/base/file_system", "axiom/fs/base/open_context", "axiom/fs/dom/domfs_util", "axiom/fs/path", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$data_type$$,
    axiom$fs$write_result$$,
    axiom$fs$read_result$$,
    axiom$fs$seek_whence$$,
    axiom$fs$base$file_system$$,
    axiom$fs$base$open_context$$,
    axiom$fs$dom$domfs_util$$,
    axiom$fs$path$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var WriteResult;
    WriteResult = axiom$fs$write_result$$["default"];
    var ReadResult;
    ReadResult = axiom$fs$read_result$$["default"];
    var SeekWhence;
    SeekWhence = axiom$fs$seek_whence$$["default"];
    var FileSystem;
    FileSystem = axiom$fs$base$file_system$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];
    var domfsUtil;
    domfsUtil = axiom$fs$dom$domfs_util$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef DomFileSystem$$module$axiom$fs$dom$file_system */
    var DomFileSystem;

    /** @typedef OpenMode$$module$axiom$fs$open_mode */
    var OpenMode;

    var DomOpenContext = function(domfs, path, mode) {
      OpenContext.call(this, domfs, path, mode);

      this.onFileError_ = domfsUtil.rejectFileError.bind(null, path.spec);

      // The current read/write position.
      this.position_ = 0;

      // The DOM FileEntry we're operation on.
      this.entry_ = null;

      // THe DOM file we're operating on.
      this.file_ = null;
    };

    __es6_export__("DomOpenContext", DomOpenContext);
    __es6_export__("default", DomOpenContext);

    DomOpenContext.prototype = Object.create(OpenContext.prototype);

    /**
     * If whence is undefined, this call succeeds with no side effects.
     *
     * @override
     * @param {number} offset
     * @param {SeekWhence} whence
     * @return {!Promise<undefined>}
     */
    DomOpenContext.prototype.seek = function(offset, whence) {
      return OpenContext.prototype.seek.call(this, offset, whence).then(function() {
        var fileSize = this.file_.size;
        var start = this.position_;

        if (!whence)
          return Promise.resolve();

        if (whence == SeekWhence.Begin) {
          start = offset;
        } else if (whence == SeekWhence.Current) {
          start += offset;
        } else if (whence == SeekWhence.End) {
          start = fileSize + offset;
        }

        if (start > fileSize) {
          return Promise.reject(new AxiomError.Runtime('reached end of file.'));
        }

        if (start < 0) {
          return Promise.reject(new AxiomError.Runtime(
              'Invalid file offset: ' + this.path.spec));
        }

        this.position_ = start;
        return Promise.resolve();
      }.bind(this));
    };

    /**
     * Returns a promise that completes when the open is no longer valid.
     *
     * @override
     * @return {!Promise<undefined>}
     */
    DomOpenContext.prototype.open = function() {
      return OpenContext.prototype.open.call(this).then(function() {
        return new Promise(function(resolve, reject) {
          var onFileError = this.onFileError_.bind(null, reject);
          var onStat = function(stat) {
            this.entry_.file(function(f) {
                this.file_ = f;
                this.ready();
                return resolve();
            }.bind(this), onFileError);
          }.bind(this);

          var onFileFound = function(entry) {
            this.entry_ = entry;
            if (this.mode.write && this.mode.truncate) {
              this.entry_.createWriter(
                  function(writer) {
                    writer.truncate(0);
                    domfsUtil.statEntry(entry).then(onStat).catch(onFileError);
                  },
                  reject);
              return;
            }

            domfsUtil.statEntry(entry).then(function(value) {
              onStat(value);
            }).catch(function(e) {
              reject(e);
            });
          }.bind(this);

          this.fileSystem.fileSystem.root.getFile(
              domfsUtil.makeDomfsPath(this.path),
              {create: this.mode.create,
               exclusive: this.mode.exclusive
              },
              onFileFound, onFileError);
        }.bind(this));
      }.bind(this));
    };

    /**
     * @override
     * @param {number} offset
     * @param {SeekWhence} whence
     * @param {?DataType} datatype
     * @return {!Promise<!ReadResult>}
     */
    DomOpenContext.prototype.read = function(offset, whence, dataType) {
      dataType = dataType || DataType.UTF8String;

      return OpenContext.prototype.read.call(this, offset, whence, dataType).then(
          function(readResult) {
        return new Promise(function(resolve, reject) {
          this.seek(offset, whence).then(function() {

            var fileSize = this.file_.size;
            var end;
            if (offset) {
              end = this.position_ + offset;
            } else {
              end = fileSize;
            }

            var reader = new FileReader();

            reader.onload = function(e) {
              this.position_ = end + 1;
              var data = reader.result;

              if (dataType == DataType.Base64String && typeof data == 'string') {
                // TODO: By the time we read this into a string the data may already
                // have been munged.  We need an ArrayBuffer->Base64 string
                // implementation to make this work for real.
                data = window.btoa(data);
              }

              readResult.data = data;
              return resolve(readResult);
            }.bind(this);

            reader.onerror = function(error) {
              return this.onFileError_(reject, error);
            };

            var slice = this.file_.slice(this.position_, end);
            if (dataType == DataType.Blob) {
              readResult.data = slice;
              return resolve(readResult);
            }  else if (dataType == 'arraybuffer') {
              reader.readAsArrayBuffer(slice);
            } else {
              reader.readAsText(slice);
            }
          }.bind(this));
        }.bind(this));
      }.bind(this));
    };

    /**
     * @override
     * @param {number} offset
     * @param {SeekWhence} whence
     * @param {?DataType} dataType
     * @param {*} data
     * @return {!Promise<!WriteResult>}
     */
    DomOpenContext.prototype.write = function(offset, whence, dataType, data) {
      return OpenContext.prototype.write.call(this, offset, whence, dataType, data)
          .then(function(writeResult) {
        dataType = dataType || DataType.UTF8String;
        return new Promise(function(resolve, reject) {
          var onWriterReady = function(writer) {
            var blob;
            if (data instanceof Blob) {
              blob = data;
            } else if (data instanceof ArrayBuffer) {
              blob = new Blob([data], {type: 'application/octet-stream'});
            } else if (dataType == 'base64-string' && typeof data == 'string') {
              // TODO: Once we turn this into a string the data may already have
              // been munged.  We need an ArrayBuffer->Base64 string implementation
              // to make this work for real.
              blob = new Blob([window.atob(data)],
                              {type: 'application/octet-stream'});
            } else if (dataType == 'utf8-string') {
              blob = new Blob([data],  {type: 'text/plain'});
            } else if (dataType == 'value') {
              blob = new Blob([JSON.stringify(data)],  {type: 'text/json'});
            }

            writer.onerror = function(error) {
              return this.onFileError_(reject, error);
            }.bind(this);

            writer.onwrite = function() {
              this.position_ = this.position_ + blob.size;
                return resolve(writeResult);
            }.bind(this);

            writer.seek(this.position_);
            writer.write(blob);
          }.bind(this);

          this.seek(offset, whence).then(function() {
            this.entry_.createWriter(
                onWriterReady,
                this.onFileError_.bind(null, reject));
          }.bind(this));
        }.bind(this));
      }.bind(this));
    };
  }
);

//# sourceMappingURL=open_context.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/gdrive/file_system",
  ["axiom/core/error", "axiom/fs/path", "axiom/fs/base/execute_context", "axiom/fs/base/file_system", "axiom/fs/base/file_system_manager", "axiom/fs/gdrive/open_context", "axiom/fs/gdrive/gdrivefs_util", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$path$$,
    axiom$fs$base$execute_context$$,
    axiom$fs$base$file_system$$,
    axiom$fs$base$file_system_manager$$,
    axiom$fs$gdrive$open_context$$,
    axiom$fs$gdrive$gdrivefs_util$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var ExecuteContext;
    ExecuteContext = axiom$fs$base$execute_context$$["default"];
    var FileSystem;
    FileSystem = axiom$fs$base$file_system$$["default"];
    var FileSystemManager;
    FileSystemManager = axiom$fs$base$file_system_manager$$["default"];
    var GDriveOpenContext;
    GDriveOpenContext = axiom$fs$gdrive$open_context$$["default"];
    var gdrivefsUtil;
    gdrivefsUtil = axiom$fs$gdrive$gdrivefs_util$$["default"];

    /** @typedef OpenContext$$module$axiom$fs$base$open_context */
    var OpenContext;

    /** @typedef OpenMode$$module$axiom$fs$open_mode */
    var OpenMode;

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    var GDriveFileSystem = function(fileSystemManager, name) {
      FileSystem.call(this, fileSystemManager, name);

      /** @type {string} */
      this.description = 'GDrive file system';
    };

    __es6_export__("GDriveFileSystem", GDriveFileSystem);
    __es6_export__("default", GDriveFileSystem);

    GDriveFileSystem.prototype = Object.create(FileSystem.prototype);

    GDriveFileSystem.available = function() {
      // The best guess absent an actual attempt to mount, which involves the
      // modal authorization flow.
      return !!navigator;
    };

    /**
     * @param {!FileSystemManager} fileSystemManager
     * @param {!string} name The file system name
     */
    GDriveFileSystem.mount = function(fileSystemManager, name) {
      var fs = new GDriveFileSystem(fileSystemManager, name);
      return fs.bringOnline().then(function() {
        return fileSystemManager.mount(fs);
      });
    };

    /**
     * @private
     * @param {Path} path
     * @return {!boolean}
     */
    GDriveFileSystem.prototype.isValidPath_ = function(path) {
      return !!(path && path.isValid && path.root === this.name);
    };

    /**
     * @private
     * @param {...Path} var_args
     */
    GDriveFileSystem.prototype.validatePaths_ = function(var_args) {
      for (var i = 0; i < arguments.length; ++i) {
        var path = arguments[i];
        if (!this.isValidPath_(path))
          throw new AxiomError.Invalid('path', path.originalSpec);
      }
    };

    /**
     * Obtain an initial authorization when the GDrive FS is about to be accessed
     * for the first time in this Axiom session: loads GDrive API client,
     * authenticates the user, and requests the user's authorization for the app
     * to access their GDrive via a browser popup (unless the browser session is
     * already authorized, in which case the popup is not displayed).
     *
     * After this process is done, the GDrive FS is ready to be used.
     *
     * @return {!Promise<undefined>} Operation completion.
     */
    GDriveFileSystem.prototype.bringOnline = function() {
      return gdrivefsUtil.initGDrive().then(function() {
        this.ready();
      }.bind(this));
    };

    /**
     * Re-request user's authorization for the app to access their GDrive if the
     * existing authorization has expired.
     *
     * After this process is done,
     * the GDrive FS is ready to be used.
     *
     * @return {!Promise<undefined>} Operation completion.
     */
    GDriveFileSystem.prototype.refreshOnline = function() {
      return gdrivefsUtil.authenticateWithGDrive(true);
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<!StatResult>}
     */
    GDriveFileSystem.prototype.stat = function(path) {
      this.validatePaths_(path);
      return this.refreshOnline().then(function() {
        return gdrivefsUtil.statEntry(path);
      });
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<!Object<string, StatResult>>}
     */
    GDriveFileSystem.prototype.list = function(path) {
      this.validatePaths_(path);
      return this.refreshOnline().then(function() {
        return gdrivefsUtil.listDirectory(path);
      });
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<undefined>}
     */
    GDriveFileSystem.prototype.mkdir = function(path) {
      this.validatePaths_(path);
      return this.refreshOnline().then(function() {
        return gdrivefsUtil.createDirectory(path);
      });
    };

    /**
     * @override
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    GDriveFileSystem.prototype.alias = function(fromPath, toPath) {
      return Promise.reject(new AxiomError.NotImplemented('To be implemented.'));
    };

    /**
     * @override
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    GDriveFileSystem.prototype.copy = function(fromPath, toPath) {
      this.validatePaths_(fromPath, toPath);
      return this.refreshOnline().then(function() {
        return gdrivefsUtil.copyEntry(fromPath, toPath);
      });
    };

    /**
     * @override
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    GDriveFileSystem.prototype.move = function(fromPath, toPath) {
      this.validatePaths_(fromPath, toPath);
      return this.refreshOnline().then(function() {
        return gdrivefsUtil.moveEntry(fromPath, toPath);
      });
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<undefined>}
     */
    GDriveFileSystem.prototype.unlink = function(path) {
      this.validatePaths_(path);
      return this.refreshOnline().then(function() {
        return gdrivefsUtil.trashEntry(path);
      });
    };

    /**
     * @override
     * @param {!Path} path
     * @param {Object} arg
     * @return {!Promise<!ExecuteContext>}
     */
    GDriveFileSystem.prototype.createExecuteContext = function(path, arg) {
      return Promise.reject(new AxiomError.NotImplemented(
          'GDrive filesystem is not executable.'));
    };

    /**
     * @override
     * @param {Path} path
     * @param {string|OpenMode} mode
     * @return {!Promise<!OpenContext>}
     */
    GDriveFileSystem.prototype.createOpenContext = function(path, mode) {
      this.validatePaths_(path);
      return this.refreshOnline().then(function() {
        var cx = new GDriveOpenContext(this, path, mode);
        return Promise.resolve(cx);
      }.bind(this));
    };
  }
);

//# sourceMappingURL=file_system.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/gdrive/gdrivefs_util",
  ["axiom/core/error", "axiom/fs/path", "axiom/fs/stat_result", "exports"],
  function(axiom$core$error$$, axiom$fs$path$$, axiom$fs$stat_result$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var StatResult;
    StatResult = axiom$fs$stat_result$$["default"];
    var gdrivefsUtil = {};
    __es6_export__("gdrivefsUtil", gdrivefsUtil);
    __es6_export__("default", gdrivefsUtil);

    gdrivefsUtil.GOOGLE_API_URL_ = 'https://apis.google.com/js/client.js';
    gdrivefsUtil.AXIOM_GDRIVE_API_SCOPES_ =
        [ 'https://www.googleapis.com/auth/drive'];
    gdrivefsUtil.AXIOM_CLIENT_ID_ =
        '827197644441-94seon1kknalmqrafhhfteied7vk7tus.apps.googleusercontent.com';
    gdrivefsUtil.DIR_MIME_TYPE_ = 'application/vnd.google-apps.folder';

    /**
     * Load the script providing a general access to Google API, including GDrive.
     *
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.loadGoogleApi = function() {
      return new Promise(function(resolve, reject) {
        if (window.gapi) {
          return resolve();
        } else {
          window.onGapiLoaded = function() {
            return resolve();
          };
          var script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = gdrivefsUtil.GOOGLE_API_URL_ + '?onload=onGapiLoaded';
          script.onerror = function() {
            return reject(new AxiomError.Runtime('Google APIs not available'));
          };
          document.head.appendChild(script);
        }
      });
    };

    /**
     * Ask the current user to authorize Axiom to access (one of) their GDrive(s).
     *
     * @param {boolean} useExisting Try to use existing authorization and skip
     *    the popup, if possible. Otherwise an auth popup will be forced.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.authenticateWithGDrive = function(useExisting) {
      return new Promise(function(resolve, reject) {
        var onAuthorize = function(authResult) {
          if (authResult && authResult.access_token) {
            // Access token has been successfully retrieved, requests can be sent
            // to the API.
            return resolve();
          } else if (useExisting) {
            // No access token could be retrieved, force the authorization flow.
            return resolve(gdrivefsUtil.authenticateWithGDrive(false));
          } else {
            return reject(new AxiomError.Runtime('Authentication failed'));
          }
        };

        // NOTE: This will display a pop-up to authorize the app and another pop-up
        // to select or login into a Google account on an as-needed basis.
        // If the user have already authorized the app's access to their GDrive,
        // access will be immediately granted, unless useExisting==false.
        gapi.auth.authorize(
            {
              client_id: gdrivefsUtil.AXIOM_CLIENT_ID_,
              scope: gdrivefsUtil.AXIOM_GDRIVE_API_SCOPES_,
              immediate: useExisting
            },
            onAuthorize
        );
      });
    };

    /**
     * Load the GDrive API client.
     *
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.loadGDriveClient = function() {
      return new Promise(function(resolve, reject) {
        if (window.gapi && window.gapi.client && window.gapi.client.drive) {
          return resolve();
        } else {
          gapi.client.load('drive', 'v2', function() {
            // TODO(ussuri): Handle network errors.
            return resolve();
          });
        }
      });
    };

    /**
     * Load GDrive API client, authenticate the user, and request the user's
     * authorization for the app to access their GDrive via a browser popup (unless
     * the browser session is already authorized, in which case the popup is not
     * displayed).
     *
     * After the above process completes, the GDrive APIs are ready to be used as
     * described here:
     * https://developers.google.com/drive/v2/reference/.
     *
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.initGDrive = function() {
      return gdrivefsUtil.loadGoogleApi().then(function() {
        return gdrivefsUtil.loadGDriveClient().then(function() {
          return gdrivefsUtil.authenticateWithGDrive(true);
        });
      });
    };

    /**
     * Get the metadata for the given GDrive entry.
     *
     * @private
     * @param {!string} entryId The ID of the entry to get metadata for.
     * @return {!Promise<!gapi.GDriveEntry>} The found entry.
     */
    gdrivefsUtil.getEntry_ = function(entryId) {
      return new Promise(function(resolve, reject) {
        var request = gapi.client.drive.files.get({fileId: entryId});
        request.execute(function(response) {
          if (!response.error) {
            // NOTE: GDrive API returns the result differently for 'root' and
            // everything else.
            return resolve(entryId === 'root' ? response : response.item);
          } else if (response.error.code == 401) {
            // OAuth access token may have expired.
            return reject(new AxiomError.Runtime(response.error.message));
          } else {
            return reject(new AxiomError.Runtime(response.error.message));
          }
        });
      });
    };

    /**
     * Get the entry for the given GDrive absolute path.
     *
     * @param {Path} path The absolute path of an entry to search for.
     * @return {!Promise<!gapi.GDriveEntry>} The found entry.
     */
    gdrivefsUtil.getEntry = function(path) {
      // TODO(ussuri): See TODO in getChildEntry_. In addition to a possibly
      // incomplete list of results, here we can get a false negative since we
      // don't traverse the whole graph of paths.

      var resolveChild = function(childName, childMimeType, parentDir) {
        return gdrivefsUtil.getChildEntry_(parentDir.id, childName, childMimeType);
      };

      // Resolve the path level-by-level by forming a chain of Promises that are
      // sequentially dependent on each other, starting with the top level with the
      // special ID 'root'.
      var promise = gdrivefsUtil.getEntry_('root');
      for (var i = 0; i < path.elements.length; ++i) {
        var mimeType =
            i < path.elements.length - 1 ? gdrivefsUtil.DIR_MIME_TYPE_ : undefined;
        // The resolved promise supplies `parentDir` argument to `resolveChild`.
        promise = promise.then(resolveChild.bind(null, path.elements[i], mimeType));
      }
      return promise;
    };

    /**
     * Get a child entry with the given name inside a given directory.
     *
     * @private
     * @param {!string} parentId ID of the directory to search in.
     * @param {!string} childName Name of a child to find.
     * @param {string=} opt_mimeType Optional MIME type of a child to find.
     * @return {!Promise<!gapi.GDriveEntry>} Metadata for the entry.
     */
    gdrivefsUtil.getChildEntry_ = function(parentId, name, opt_mimeType) {
      return new Promise(function(resolve, reject) {
        // TODO(ussuri): It may be necessary to escape possible quotes in `name`.
        var query =
            '"' + parentId + '" in parents' +
            ' and title="' + name + '"' +
            ' and trashed=false' +
            (opt_mimeType ? (' and mimeType="' + opt_mimeType + '"') : '');
        var request = gapi.client.drive.files.list({
            folderId: parentId,
            q: query
        });

        request.execute(function(response) {
          if (!response.error) {
            if (response.items.length === 0)
              return reject(new AxiomError.NotFound('entry', name));

            // TODO(ussuri): This doesn't account for possible entries with the same
            // name on each level of the path, which GDrive permits, which may
            // yield an incomplete list of results.
            return resolve(response.items[0]);
          } else if (response.error.code == 401) {
            // OAuth access token may have expired.
            return reject(new AxiomError.Runtime(response.error.message));
          } else {
            return reject(new AxiomError.Runtime(response.error.message));
          }
        });
      });
    };

    /**
     * Get 'stat' value for the given GDrive entry.
     *
     * @private
     * @param {!gapi.GDriveEntry} entry A GDrive entry to stat.
     * @return {!StatResult} The stat object for the entry.
     */
    gdrivefsUtil.entryToStat_ = function(entry) {
      // TODO(ussuri): Add available conversion formats to StatResult (for gdocs).
      if (entry.mimeType === gdrivefsUtil.DIR_MIME_TYPE_) {
        return new StatResult({
          mode: Path.Mode.R | Path.Mode.D,
          mtime: new Date(entry.modifiedDate).getTime(),
        });
      } else {
        // TODO(ussuri): There are many ways to determine the below from entry.
        // Make sure this is 100% reliable and exhaustive.
        // 1) Only "real" files have `downloadUrl` on them. GDrive docs have
        // `exportLinks` instead.
        // 2) Some Google docs may not even have the latter (e.g. GMap's
        // My Places).
        // 3) `copyable` might be mutually redundant with the other two.
        // 4) Err on the safer side when assigning 'W' mode: `editable`
        // may be enough, but further limit it to real files, even though
        // Google docs can be theoretically updated via the API.
        var mode = 0;
        if (entry.copyable && (entry.downloadUrl || entry.exportLinks)) {
          mode |= Path.Mode.R | Path.Mode.K;
        }
        if (entry.editable && entry.downloadUrl) {
          mode |= Path.Mode.W;
        }
        return new StatResult({
          dataType: 'blob',
          mimeType: entry.mimeType,
          mode: mode,
          mtime: new Date(entry.modifiedDate).getTime(),
          size: entry.fileSize // Can be 'undefined' for Google docs.
        });
      }
    };

    /**
     * Get 'stat' value for a GDrive entry with the given absolute path.
     *
     * @param {Path} path Path to a GDrive entry to stat.
     * @return {!Promise<!StatResult>} The stat object for the entry.
     */
    gdrivefsUtil.statEntry = function(path) {
      return gdrivefsUtil.getEntry(path).then(
          /** @type {function(?)} */ function(entry) {
        return gdrivefsUtil.entryToStat_(entry);
      });
    };

    /**
     * Download the content of a resource with the given URL.
     *
     * @private
     * @param {!string} url File's URL.
     * @return {!Promise<!string>} A string with the file contents.
     */
    gdrivefsUtil.downloadUrl_ = function(url) {
      return new Promise(function(resolve, reject) {
        // TODO(ussuri): Make sure we're authorized?
        var accessToken = gapi.auth.getToken().access_token;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        xhr.onload = function() {
          return resolve(xhr.responseText);
        };
        xhr.onerror = function() {
          return reject(new AxiomError.Runtime(
              'Failed to download file: ' + xhr.statusText));
        };
        xhr.send();
      });
    };

    /**
     * Download the content of a GDrive file.
     *
     * @private
     * @param {!gapi.GDriveEntry} entry The GDrive file to download.
     * @param {string=} opt_mimeType The desired MIME type:
     *       1) for "normal" files, must either match the file's type or be falsy;
     *       2) for GDrive docs, must either match one of the conversion formats
     *          provided by GDrive for this file or be falsy. If falsy, the simplest
     *          available text format is auto-selected (text/plain, text/csv etc.)
     * @return {Promise<string>} A string with the file contents.
     */
    gdrivefsUtil.downloadFile_ = function(entry, opt_mimeType) {
      if (entry.downloadUrl) {
        // A "normal" file, whose contents is stored directly in GDrive.
        if (opt_mimeType && entry.mimeType !== opt_mimeType) {
          return Promise.reject(new AxiomError.Incompatible(
              'MIME type', opt_mimeType));
        }
        return gdrivefsUtil.downloadUrl_(entry.downloadUrl);
      } else if (entry.exportLinks) {
        // A Google doc, stored outside GDrive but available for conversion.
        var mimeType;
        if (opt_mimeType) {
          if (!(opt_mimeType in entry.exportLinks)) {
            return Promise.reject(new AxiomError.Incompatible(
                'MIME type conversion', opt_mimeType));
          }
          mimeType = opt_mimeType;
        } else {
          // TODO(ussuri): Select the simplest text conversion from the available.
          if ('text/plain' in entry.exportLinks) {
            mimeType = 'text/plain';
          } else if ('text/csv' in entry.exportLinks) {
            mimeType = 'text/csv';
          } else {
            return Promise.reject(new AxiomError.NotFound(
                'text conversion', entry.title));
          }
        }
        return gdrivefsUtil.downloadUrl_(entry.exportLinks[mimeType]);
      } else {
        // A Google doc unavailable for conversion (e.g. Google My Maps).
        return Promise.reject(new AxiomError.NotFound('file', entry.title));
      }
    };

    /**
     * Download the content of a GDrive file with the given URL.
     *
     * @param {Path} path The path of the GDrive file to download.
     * @param {string=} opt_mimeType The desired MIME type:
     *       1) for "normal" files, must either be falsy or match the file's type;
     *       2) for GDrive docs, must either match one of the conversion formats
     *          provided by GDrive for this file or be falsy. If falsy, the simplest
     *          available text format is auto-selected (text/plain, text/csv etc.)
     * @return {!Promise<!string>} A string with the file contents.
     */
    gdrivefsUtil.downloadFile = function(path, opt_mimeType) {
      return gdrivefsUtil.getEntry(path).then(function(entry) {
        return gdrivefsUtil.downloadFile_(entry, opt_mimeType);
      });
    };

    /**
     * Creates a multi-part request body for GDrive Files.create and Files.update
     * APIs.
     *
     * @param {!Object<string, *>} metadata The metadata of the file/directory,
     *   as per https://developers.google.com/drive/v2/reference/files/insert and
     *   https://developers.google.com/drive/v2/reference/files/update.
     * @param {string=} opt_data The file's data.
     * @return {!Object<string, *>} A dictionary with 'body' and 'contentType' keys.
     */
    gdrivefsUtil.createRequestBody_ = function(metadata, opt_data) {
      var BOUNDARY = '-------axiom_boundary';
      var DELIMITER = '\r\n--' + BOUNDARY + '\r\n';
      var END_DELIMITER = '\r\n--' + BOUNDARY + '--';
      if (!metadata.mimeType) {
        metadata.mimeType = 'application/octet-stream';
      }
      var body =
          DELIMITER +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata);
      if (!!opt_data) {
          var base64Data = window.btoa(opt_data);
          body +=
              DELIMITER +
              'Content-Type: ' + metadata.mimeType + '\r\n' +
              'Content-Transfer-Encoding: base64\r\n' +
              '\r\n' +
              base64Data;
      }
      body += END_DELIMITER;
      return {
        body: body,
        contentType: 'multipart/mixed; boundary="' + BOUNDARY + '"'
      };
    };

    /**
     * Create a new GDrive file or directory.
     *
     * @private
     * @param {!gapi.GDriveEntry} parentDir The entry of the parent directory.
     * @param {!string} name The name of the file.
     * @param {string=} opt_mimeType The file's MIME type.
     * @param {string=} opt_data The file's data.
     * @return {!Promise<!gapi.GDriveEntry>} Operation's completion.
     */
    gdrivefsUtil.createFile_ = function(parentDir, name, opt_mimeType, opt_data) {
      return new Promise(function(resolve, reject) {
        var requestBody = gdrivefsUtil.createRequestBody_(
            {
              title: name,
              mimeType: opt_mimeType,
              parents: [{id: parentDir.id}]
            },
            opt_data);
        var request = gapi.client.request({
            path: '/upload/drive/v2/files',
            method: 'POST',
            params: {
              uploadType: 'multipart'
            },
            headers: {
              'Content-Type': requestBody.contentType
            },
            body: requestBody.body,
        });
        request.execute(function(response) {
          if (!response.error) {
            return resolve(response);
          } else if (response.error.code == 401) {
            // OAuth access token may have expired.
            return reject(new AxiomError.Runtime(response.error.message));
          } else if (response.error.code >= 500 && response.error.code < 600) {
            // TODO(ussuri): These errors are transient: should retry uploading.
            return reject(new AxiomError.Runtime(response.error.message));
          } else {
            return reject(new AxiomError.Runtime(response.error.message));
          }
        });
      });
    };

    /**
     * Upload a new GDrive file with the given contents.
     *
     * @private
     * @param {!gapi.GDriveEntry} file The file entry to update.
     * @param {!string} data The file's data.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.updateFile_ = function(file, data) {
      return new Promise(function(resolve, reject) {
        var requestBody = gdrivefsUtil.createRequestBody_(
            {mimeType: file.mimeType}, data);
        var request = gapi.client.request({
            path: '/upload/drive/v2/files/' + file.id,
            method: 'PUT',
            params: {
              uploadType: 'multipart'
            },
            headers: {
              'Content-Type': requestBody.contentType
            },
            body: requestBody.body
        });
        request.execute(function(response) {
          if (!response.error) {
            return resolve();
          } else if (response.error.code == 401) {
            // OAuth access token may have expired.
            // TODO(ussuri): Auto-trigger reauthorization?
            return reject(new AxiomError.Runtime(response.error.message));
          } else if (response.error.code >= 500 && response.error.code < 600) {
            // TODO(ussuri): These errors are transient: should retry uploading.
            return reject(new AxiomError.Runtime(response.error.message));
          } else {
            return reject(new AxiomError.Runtime(response.error.message));
          }
        });
      });
    };

    /**
     * Upload a new or override an existing GDrive file with the given contents.
     * If the target exists, it is moved to the trash first, so it can be recovered
     * by the user via GDrive web UI.
     *
     * @param {Path} path The path of the new file.
     * @param {!string} data The file's data.
     * @param {!string} mimeType The data's MIME type.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.uploadFile = function(path, data, opt_mimeType) {
      // TODO(ussuri): For Google docs, add the new data as a new history revision?
      // TODO(ussuri): Optimize: path's prefix gets resolved twice in trashEntry()
      // and getEntry(parentPath).
      return gdrivefsUtil.trashEntry(path).catch(function(error) {
        if (error instanceof AxiomError.NotFound) {
          // Not finding target is ok: means we're just creating a new one.
          return Promise.resolve();
        } else {
          // Any other error is bad: we don't want to overwrite the target without
          // ability to recover it from the trash.
          return Promise.reject(error);
        }
      }).then(function() {
        var parentPath = path.getParentPath();
        var baseName = path.getBaseName();
        return gdrivefsUtil.getEntry(parentPath)
            .then(function(parentDir) {
          return gdrivefsUtil.createFile_(parentDir, baseName, opt_mimeType, data);
        });
      });
    };

    /**
     * Get a list of direct children of a given directory.
     *
     * @private
     * @param {!string} dirId The entry ID of the directory to list.
     * @return {!Promise<!Object<string, StatResult>>} Array of entry stats.
     */
    gdrivefsUtil.listDirectory_ = function(dirId) {
      return new Promise(function(resolve, reject) {
        var request = gapi.client.drive.files.list({
            q: '"' + dirId + '" in parents and trashed = false'
        });

        request.execute(function(response) {
          if (!response.error) {
            var stats = {};
            for (var i = 0; i < response.items.length; ++i) {
              var entry = response.items[i];
              stats[entry.title] = gdrivefsUtil.entryToStat_(entry);
            }
            return resolve(stats);
          } else if (response.error.code == 401) {
            // OAuth access token may have expired.
            // TODO(ussuri): Auto-trigger reauthorization?
            return reject(new AxiomError.Runtime(response.error.message));
          } else {
            return reject(new AxiomError.Runtime(response.error.message));
          }
        });
      });
    };

    /**
     * Get a list of direct children of a given directory.
     *
     * @param {Path} path The absolute path of the directory to list.
     * @return {!Promise<!Object<string, StatResult>>} A map of children's stats.
     */
    gdrivefsUtil.listDirectory = function(path) {
      return gdrivefsUtil.getEntry(path).then(function(entry) {
        return gdrivefsUtil.listDirectory_(entry.id);
      });
    };

    /**
     * Create a directory.
     *
     * @param {Path} path The absolute path of the directory to create.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.createDirectory = function(path) {
      var parentPath = path.getParentPath();
      var baseName = path.getBaseName();

      if (!parentPath || !baseName)
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      return gdrivefsUtil.getEntry(parentPath)
          .then(function(parentDir) {
        return gdrivefsUtil.createFile_(
            parentDir, baseName, gdrivefsUtil.DIR_MIME_TYPE_);
      });
    };

    /**
     * Copy an entry to another name and/or parent.
     *
     * @private
     * @param {!gapi.GDriveEntry} entry The entry to copy.
     * @param {!gapi.GDriveEntry} targetDir The target directory entry.
     * @param {!string} newName The target new name.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.copyEntry_ = function(entry, targetDir, newName) {
      return new Promise(function(resolve, reject) {
        var request = gapi.client.drive.files.copy({
            fileId: entry.id,
            parents: [{id: targetDir.id}],
            title: newName
        });
        request.execute(function(response) {
          if (!response.error) {
            return resolve(response);
          } else if (response.error.code == 401) {
            // OAuth access token may have expired.
            return reject(new AxiomError.Runtime(response.error.message));
          } else {
            return reject(new AxiomError.Runtime(response.error.message));
          }
        });
      });
    };

    /**
     * Copy an entry to another name and/or parent.
     *
     * @param {Path} fromPath The absolute path of the entry to move.
     * @param {Path} toPath The absolute path to move to. Can include the new target
     *    name; otherwise, must specify an existing dir.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.copyEntry = function(fromPath, toPath) {
      var toPathPrefix = toPath.getParentPath();
      var toPathSuffix = toPath.getBaseName();

      return gdrivefsUtil.getEntry(toPathPrefix).then(
          function(toPrefixEntry) {
        return gdrivefsUtil.getChildEntry_(toPrefixEntry.id, toPathSuffix).then(
            function(toSuffixEntry) {
          if (toSuffixEntry.mimeType !== gdrivefsUtil.DIR_MIME_TYPE_) {
            // toPath points at an existing file.
            return Promise.reject(
              new AxiomError.Duplicate('toPath', toPath.originalSpec));
          }
          // toPath points at an existing directory: take the target name from the
          // source.
          return Promise.resolve({
            dir: toSuffixEntry,
            name: fromPath.getBaseName()
          });
        }).catch(function(error) {
          if (!AxiomError.NotFound.test(error)) {
            return Promise.reject(new AxiomError.Runtime(error.message));
          }
          // The prefix of the toPath was found, but the suffix was not: the
          // former is our target dir, and the latter is our target name.
          return Promise.resolve({
            dir: toPrefixEntry,
            name: toPathSuffix
          });
        });
      }).then(function(target) {
        return gdrivefsUtil.getEntry(fromPath).then(function(fromEntry) {
          return gdrivefsUtil.copyEntry_(fromEntry, target.dir, target.name);
        });
      });
    };

    /**
     * Move an entry to another name/parent.
     *
     * @param {Path} fromPath The absolute path of the entry to move.
     * @param {Path} toPath The absolute path to move to. Can include the new target
     *    name; otherwise, must specify an existing dir.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.moveEntry = function(fromPath, toPath) {
      return gdrivefsUtil.copyEntry(fromPath, toPath).then(function() {
        return gdrivefsUtil.deleteEntry(fromPath);
      });
    };

    /**
     * Move an entry to the trash folder or permanently delete an entry.
     *
     * @private
     * @param {!gapi.GDriveEntry} entry The entry to delete.
     * @param {!boolean} skipTrash Whether to move to the trash or delete permanently.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.removeEntry_ = function(entryId, skipTrash) {
      return new Promise(function(resolve, reject) {
        var method = skipTrash ? 'delete' : 'trash';
        var request = gapi.client.drive.files[method]({
            fileId: entryId
        });
        request.execute(function(response) {
          if (!response.error) {
            return resolve();
          } else if (response.error.code == 401) {
            // OAuth access token may have expired.
            return reject(new AxiomError.Runtime(response.error.message));
          } else {
            return reject(new AxiomError.Runtime(response.error.message));
          }
        });
      });
    };

    /**
     * Move an entry to the trash folder.
     *
     * @param {Path} path The absolute path of the entry to delete.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.trashEntry = function(path) {
      return gdrivefsUtil.getEntry(path).then(function(entry) {
        return gdrivefsUtil.removeEntry_(entry.id, false);
      });
    };

    /**
     * Permanently delete an entry.
     *
     * @param {Path} path The absolute path of the entry to delete.
     * @return {!Promise<undefined>} Operation's completion.
     */
    gdrivefsUtil.deleteEntry = function(path) {
      return gdrivefsUtil.getEntry(path).then(function(entry) {
        return gdrivefsUtil.removeEntry_(entry.id, true);
      });
    };
  }
);

//# sourceMappingURL=gdrivefs_util.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/gdrive/open_context",
  ["axiom/core/error", "axiom/fs/data_type", "axiom/fs/write_result", "axiom/fs/read_result", "axiom/fs/seek_whence", "axiom/fs/base/file_system", "axiom/fs/base/open_context", "axiom/fs/gdrive/gdrivefs_util", "axiom/fs/path", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$data_type$$,
    axiom$fs$write_result$$,
    axiom$fs$read_result$$,
    axiom$fs$seek_whence$$,
    axiom$fs$base$file_system$$,
    axiom$fs$base$open_context$$,
    axiom$fs$gdrive$gdrivefs_util$$,
    axiom$fs$path$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var WriteResult;
    WriteResult = axiom$fs$write_result$$["default"];
    var ReadResult;
    ReadResult = axiom$fs$read_result$$["default"];
    var SeekWhence;
    SeekWhence = axiom$fs$seek_whence$$["default"];
    var FileSystem;
    FileSystem = axiom$fs$base$file_system$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];
    var gdrivefsUtil;
    gdrivefsUtil = axiom$fs$gdrive$gdrivefs_util$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef GDriveFileSystem$$module$axiom$fs$gdrive$file_system */
    var GDriveFileSystem;

    /** @typedef OpenMode$$module$axiom$fs$open_mode */
    var OpenMode;

    var GDriveOpenContext = function(gdrivefs, path, mode, opt_mimeType) {
      OpenContext.call(this, gdrivefs, path, mode);

      // The MIME type of the file.
      // For read contexts:
      // - real files: must either be falsy or match the actual file's type; 
      // - Google docs: must match one of the conversion formats provided by GDrive.
      // For write contexts:
      // - can be anything;
      // - if omitted, GDrive will auto-detect the type from the file's extension.
      this.mimeType_ = opt_mimeType;

      // The contents of the downloaded ("real") or converted (Google doc) file.
      this.data_ = '';

      // The current read/write position.
      this.position_ = 0;
    };

    __es6_export__("GDriveOpenContext", GDriveOpenContext);
    __es6_export__("default", GDriveOpenContext);

    GDriveOpenContext.prototype = Object.create(OpenContext.prototype);

    /**
     * @override
     * @return {!Promise<undefined>} Operation completion
     */
    GDriveOpenContext.prototype.open = function() {
      return OpenContext.prototype.open.call(this).then(function() {
        if (this.mode.read) {
          return gdrivefsUtil.downloadFile(this.path, this.mimeType_).then(
              function(data) {
            this.data_ = data;
            this.ready();
          }.bind(this));
        }

        // TODO(ussuri): Support `write` without `truncate`.
        if (this.mode.write && this.mode.truncate) {
          this.data_ = '';
          this.ready();
          return Promise.resolve();
        }

        this.closeError(new AxiomError.Invalid('open mode', this.mode));
      }.bind(this));
    };

    /**
     * If whence is undefined, this call succeeds with no side effects.
     *
     * @override
     * @param {number} offset
     * @param {SeekWhence} whence
     * @return {!Promise<undefined>}
     */
    GDriveOpenContext.prototype.seek = function(offset, whence) {
      return OpenContext.prototype.seek.call(this, offset, whence).then(function() {
        var fileSize = this.data_.length;
        var start = this.position_;

        if (!whence)
          return Promise.resolve();

        if (whence == SeekWhence.Begin) {
          start = offset;
        } else if (whence == SeekWhence.Current) {
          start += offset;
        } else if (whence == SeekWhence.End) {
          start = fileSize + offset;
        }

        if (start > fileSize) {
          return Promise.reject(new AxiomError.Runtime('reached end of file.'));
        }

        if (start < 0) {
          return Promise.reject(new AxiomError.Runtime(
              'Invalid file offset: ' + this.path.spec));
        }

        this.position_ = start;
        return Promise.resolve();
      }.bind(this));
    };

    /**
     * @override
     * @param {number} offset
     * @param {SeekWhence} whence
     * @param {?DataType} dataType
     * @return {!Promise<!ReadResult>}
     */
    GDriveOpenContext.prototype.read = function(offset, whence, dataType) {
      // TODO(ussuri): In v.1.0, limit support to UTF-8 only.
      if (dataType != DataType.UTF8String)
        throw new AxiomError.Invalid('dataType', dataType);

      return OpenContext.prototype.read.call(this, offset, whence, dataType)
          .then(function(readResult) {
        return this.seek(offset, whence).then(function() {
          readResult.data = this.data_.substr(
              this.position_,
              offset ? (this.position_ + offset) : this.data_.size
          );
          return readResult;
        }.bind(this));
      }.bind(this));
    };

    /**
     * @override
     * @param {number} offset
     * @param {SeekWhence} whence
     * @param {?DataType} dataType
     * @param {*} data
     * @return {!Promise<!WriteResult>}
     */
    GDriveOpenContext.prototype.write = function(offset, whence, dataType, data) {
      return OpenContext.prototype.write.call(this, offset, whence, dataType, data)
          .then(function(writeResult) {
        // TODO(ussuri): In v.1.0, ignore dataType.
        return this.seek(offset, whence).then(function() {
          this.data_ =
              this.data_.substring(0, this.position_) +
              data +
              this.data_.substring(this.position_ + data.length);
          return gdrivefsUtil.uploadFile(this.path, this.data_, this.mimeType_)
              .then(function() {
            return writeResult;
          });
        }.bind(this));
      }.bind(this));
    };
  }
);

//# sourceMappingURL=open_context.js.map
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

define(
  "axiom/fs/js/directory",
  ["axiom/core/error", "axiom/fs/path", "axiom/fs/base/file_system", "axiom/fs/js/entry", "axiom/fs/js/executable", "axiom/fs/js/resolve_result", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$path$$,
    axiom$fs$base$file_system$$,
    axiom$fs$js$entry$$,
    axiom$fs$js$executable$$,
    axiom$fs$js$resolve_result$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var FileSystem;
    FileSystem = axiom$fs$base$file_system$$["default"];
    var JsEntry;
    JsEntry = axiom$fs$js$entry$$["default"];
    var JsExecutable;
    JsExecutable = axiom$fs$js$executable$$["default"];
    var JsResolveResult;
    JsResolveResult = axiom$fs$js$resolve_result$$["default"];

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
    var JsFileSystem;

    var JsDirectory = function(jsfs) {
      JsEntry.call(this, jsfs, 'D');

      /** @type {Object<string, (JsEntry|FileSystem)>} */
      this.entries_ = {};
    };

    __es6_export__("JsDirectory", JsDirectory);
    __es6_export__("default", JsDirectory);

    JsDirectory.prototype = Object.create(JsEntry.prototype);

    /**
     * Resolve a Path object as far as possible.
     *
     * This may return a partial result which represents the depth to which
     * the path can be resolved.
     *
     * @param {Path} path An object representing the path to resolve.
     * @param {number=} opt_index The optional index into the path elements where
     *   we should start resolving.  Defaults to 0, the first path element.
     * @return {!JsResolveResult}
     */
    JsDirectory.prototype.resolve = function(path, opt_index) {
      var index = opt_index || 0;

      if (!this.entryExists(path.elements[index])) {
        return new JsResolveResult(
            path.elements.slice(0, index),
            path.elements.slice(index),
            this);
      }

      var entry = this.entries_[path.elements[index]] || null;

      if (index == path.elements.length - 1)
        return new JsResolveResult(path.elements, null, entry);

      if (entry instanceof JsDirectory)
        return entry.resolve(path, index + 1);

      return new JsResolveResult(path.elements.slice(0, index + 1),
                                 path.elements.slice(index + 1),
                                 entry);
    };

    /**
     * Return true if the named entry exists in this directory.
     *
     * @param {string} name
     * @return {!boolean}
     */
    JsDirectory.prototype.entryExists = function(name) {
      return this.entries_.hasOwnProperty(name);
    };

    /**
     * Link the given entry into this directory.
     *
     * This method is not directly reachable through the FileSystem.
     *
     * @param {string} name  A name to give the entry.
     * @param {JsEntry} entry
     * @return {void}
     */
    JsDirectory.prototype.link = function(name, entry) {
      if (!(entry instanceof JsEntry))
        throw new AxiomError.TypeMismatch('instanceof JsEntry', entry);

      if (this.entries_.hasOwnProperty(name))
        throw new AxiomError.Duplicate('directory-name', name);

      this.entries_[name] = entry;
    };

    /**
     * Link the given FileSystem into this directory.
     *
     * This method is not directly reachable through the FileSystem.
     *
     * @param {string} name  A name to give the file system.
     * @param {FileSystem} fileSystem
     * @return {void}
     */
    JsDirectory.prototype.mount = function(name, fileSystem) {
      if (!(fileSystem instanceof FileSystem)) {
        throw new AxiomError.TypeMismatch('instanceof FileSystem',
                                          fileSystem);
      }

      if (this.entries_.hasOwnProperty(name))
        throw new AxiomError.Duplicate('directory-name', name);

      this.entries_[name] = fileSystem;
    };

    /**
     * @param {Object<string, (function(JsExecuteContext)|Array)>} executables
     * @return {void}
     */
    JsDirectory.prototype.install = function(executables) {
      for (var name in executables) {
        var callback;
        var signature;

        if (typeof executables[name] == 'function') {
          callback = executables[name];
          signature = callback.signature || {};
        } else if (typeof executables[name] == 'object' &&
            executables[name].length == 2) {
          callback = executables[name][1];
          signature = executables[name][0];
        } else {
          throw new AxiomError.Invalid('callback: ' + name, executables[name]);
        }

        this.link(name, new JsExecutable(this.jsfs, callback, signature));
      }
    };

    /**
     * Make a new, empty directory with the given name.
     *
     * @param {string} name
     * @return {!Promise<!JsDirectory>}
     */
    JsDirectory.prototype.mkdir = function(name) {
      if (this.entryExists(name))
        return Promise.reject(new AxiomError.Duplicate('directory-name', name));

      var dir = new JsDirectory(this.jsfs);
      this.entries_[name] = dir;
      return Promise.resolve(dir);
    };

    /**
     * Remove the entry with the given name.
     *
     * @param {string} name
     * @return {!Promise}
     */
    JsDirectory.prototype.unlink = function(name) {
      if (!this.entryExists(name))
        return Promise.reject(new AxiomError.NotFound('name', name));

      delete this.entries_[name];
      return Promise.resolve();
    };

    /**
     * Return the stat() result for each item in this directory.
     *
     * @return {!Promise<!Object<string, StatResult>>}
     */
    JsDirectory.prototype.list = function() {
      var rv = {};
      var promises = [];

      var addResult = function(name, statResult) {
        rv[name] = statResult;
      };

      for (var name in this.entries_) {
        var entry = this.entries_[name];
        var promise;

        if (entry instanceof FileSystem) {
          promise = entry.stat(entry.rootPath);
        } else {
          promise = entry.stat();
        }

        promises.push(promise.then(addResult.bind(null, name)));
      }

      return Promise.all(promises).then(function() {
        return rv;
      });
    };
  }
);

//# sourceMappingURL=directory.js.map
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

define(
 "axiom/fs/js/entry",
 ["axiom/fs/path", "axiom/fs/stat_result", "exports"],
 function(axiom$fs$path$$, axiom$fs$stat_result$$, __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var Path;
  Path = axiom$fs$path$$["default"];
  var StatResult;
  StatResult = axiom$fs$stat_result$$["default"];

  /** @typedef {JsFileSystem$$module$axiom$fs$js$file_system} */
  var JsFileSystem;

  /**
   * @constructor
   *
   * The base class for all of the things that can appear in a JsFileSystem.
   *
   * @param {JsFileSystem} jsfs  The parent file system.
   * @param {string} modeStr
   */
  var JsEntry = function(jsfs, modeStr) {
    this.jsfs = jsfs;
    this.mode = Path.modeStringToInt(modeStr);
  };

  __es6_export__("JsEntry", JsEntry);
  __es6_export__("default", JsEntry);

  /**
   * Return true if file has all of the modes in the given modeString.
   *
   * @param {string} modeStr
   */
  JsEntry.prototype.hasMode = function(modeStr) {
    return (this.mode & Path.modeStringToInt(modeStr));
  };

  /**
   * Default stat implementation.
   *
   * Overridden stat() implementations should call this first and decorate the
   * result with additional properties.
   *
   * @return {!Promise<!StatResult>}
   */
  JsEntry.prototype.stat = function() {
    return Promise.resolve(new StatResult({mode: this.mode}));
  };
 }
);

//# sourceMappingURL=entry.js.map
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

define(
  "axiom/fs/js/executable",
  ["axiom/core/error", "axiom/fs/js/entry", "exports"],
  function(axiom$core$error$$, axiom$fs$js$entry$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var JsEntry;
    JsEntry = axiom$fs$js$entry$$["default"];

    /** @typedef StatResult$$module$axiom$fs$stat_result */
    var StatResult;

    /** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
    var JsExecuteContext;

    /** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
    var JsFileSystem;

    var JsExecutable = function(jsfs, callback, signature) {
      JsEntry.call(this, jsfs, 'X');

      if (typeof callback != 'function')
        throw new AxiomError.TypeMismatch('function', callback);

      this.callback_ = callback;
      this.signature = signature;
    };

    __es6_export__("JsExecutable", JsExecutable);
    __es6_export__("default", JsExecutable);

    JsExecutable.prototype = Object.create(JsEntry.prototype);

    /**
     * @override
     */
    JsExecutable.prototype.stat = function() {
      return JsEntry.prototype.stat.call(this).then(
          function(/** StatResult */ rv) {
            rv.signature = this.signature;
            return Promise.resolve(rv);
          }.bind(this));
    };

    /**
     * @param {JsExecuteContext} cx
     * @return {Promise<*>}
     */
    JsExecutable.prototype.execute = function(cx) {
      /** @type {*} */
      var ret;

      try {
        ret = this.callback_(cx);
      } catch (err) {
        // Note: In case a command implementation throws instead of returning a
        // rejected promise, close the execution context with the error caught.
        cx.closeError(err);
        return cx.ephemeralPromise;
      }

      if (typeof ret !== 'undefined') {
        return Promise.reject(
            new AxiomError.Runtime('Executables should not return anything.'));
      }

      return cx.ephemeralPromise;
    };
  }
);

//# sourceMappingURL=executable.js.map
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

define(
  "axiom/fs/js/execute_context",
  ["axiom/fs/base/execute_context", "axiom/fs/stdio", "axiom/fs/path", "axiom/fs/js/executable", "exports"],
  function(
    axiom$fs$base$execute_context$$,
    axiom$fs$stdio$$,
    axiom$fs$path$$,
    axiom$fs$js$executable$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var ExecuteContext;
    ExecuteContext = axiom$fs$base$execute_context$$["default"];
    var Stdio;
    Stdio = axiom$fs$stdio$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var JsExecutable;
    JsExecutable = axiom$fs$js$executable$$["default"];

    /** @typedef Arguments$$module$axiom$fs$arguments */
    var Arguments;

    /** @typedef FileSystem$$module$axiom$fs$base$file_system */
    var FileSystem;

    /** @typedef JsEntry$$module$axiom$fs$js$entry */
    var JsEntry;

    /** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
    var JsFileSystem;

    var JsExecuteContext = function(jsfs, stdio, path, executable, args) {
      ExecuteContext.call(this, jsfs, stdio, path, args);

      this.jsfs = jsfs;
      this.targetExecutable = executable;
    };

    __es6_export__("JsExecuteContext", JsExecuteContext);
    __es6_export__("default", JsExecuteContext);

    JsExecuteContext.prototype = Object.create(ExecuteContext.prototype);

    /**
     * @override
     * @return {!Promise<*>}
     */
    JsExecuteContext.prototype.execute = function() {
      ExecuteContext.prototype.execute.call(this);

      return this.targetExecutable.execute(this).then(
          function(value) {
            if (this.isEphemeral('Ready'))
              return this.closeOk(value);
            return this.ephemeralPromise;
          }.bind(this),
          function(value) {
            if (this.isEphemeral('Ready'))
              return this.closeError(value);
            return this.ephemeralPromise;
          }.bind(this));
    };
  }
);

//# sourceMappingURL=execute_context.js.map
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

define(
  "axiom/fs/js/file_system",
  ["axiom/core/error", "axiom/fs/arguments", "axiom/fs/path", "axiom/fs/stat_result", "axiom/fs/base/file_system", "axiom/fs/base/file_system_manager", "axiom/fs/base/execute_context", "axiom/fs/stdio", "axiom/fs/open_mode", "axiom/fs/js/directory", "axiom/fs/js/executable", "axiom/fs/js/execute_context", "axiom/fs/js/open_context", "axiom/fs/js/resolve_result", "axiom/fs/js/value", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$arguments$$,
    axiom$fs$path$$,
    axiom$fs$stat_result$$,
    axiom$fs$base$file_system$$,
    axiom$fs$base$file_system_manager$$,
    axiom$fs$base$execute_context$$,
    axiom$fs$stdio$$,
    axiom$fs$open_mode$$,
    axiom$fs$js$directory$$,
    axiom$fs$js$executable$$,
    axiom$fs$js$execute_context$$,
    axiom$fs$js$open_context$$,
    axiom$fs$js$resolve_result$$,
    axiom$fs$js$value$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Arguments;
    Arguments = axiom$fs$arguments$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var StatResult;
    StatResult = axiom$fs$stat_result$$["default"];
    var FileSystem;
    FileSystem = axiom$fs$base$file_system$$["default"];
    var FileSystemManager;
    FileSystemManager = axiom$fs$base$file_system_manager$$["default"];
    var ExecuteContext;
    ExecuteContext = axiom$fs$base$execute_context$$["default"];
    var Stdio;
    Stdio = axiom$fs$stdio$$["default"];
    var OpenMode;
    OpenMode = axiom$fs$open_mode$$["default"];
    var JsDirectory;
    JsDirectory = axiom$fs$js$directory$$["default"];
    var JsExecutable;
    JsExecutable = axiom$fs$js$executable$$["default"];
    var JsExecuteContext;
    JsExecuteContext = axiom$fs$js$execute_context$$["default"];
    var JsOpenContext;
    JsOpenContext = axiom$fs$js$open_context$$["default"];
    var JsResolveResult;
    JsResolveResult = axiom$fs$js$resolve_result$$["default"];
    var JsValue;
    JsValue = axiom$fs$js$value$$["default"];

    /** @typedef {OpenContext$$module$axiom$fs$base$open_context} */
    var OpenContext;

    var JsFileSystem =
        function(opt_fileSystemManager, opt_name, opt_rootDirectory) {
      var fileSystemManager = opt_fileSystemManager || new FileSystemManager();
      var name = opt_name || 'jsfs';
      FileSystem.call(this, fileSystemManager, name);

      /** @type {JsDirectory} */
      this.rootDirectory = opt_rootDirectory || new JsDirectory(this);

      /** @type {string} */
      this.description = 'js file system';

      if (!opt_fileSystemManager) {
        fileSystemManager.mount(this);
      }
    };

    __es6_export__("JsFileSystem", JsFileSystem);
    __es6_export__("default", JsFileSystem);

    JsFileSystem.prototype = Object.create(FileSystem.prototype);

    /**
     * @private
     * @param {Path} path
     * @return {!boolean}
     */
    JsFileSystem.prototype.isValidPath_ = function(path) {
      return !(!path || !path.isValid || path.root !== this.name);
    };

    /**
     * Resolve a path to a specific kind of JsEntry or reference to BaseFileSystem,
     * if possible.  See JsResolveResult for more information.
     *
     * @param {Path} path
     * @return {JsResolveResult}
     */
    JsFileSystem.prototype.resolve = function(path) {
      if (!path.elements.length)
        return new JsResolveResult(null, null, this.rootDirectory);

      return this.rootDirectory.resolve(path, 0);
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<!StatResult>}
     */
    JsFileSystem.prototype.stat = function(path) {
      if (!path)
        return this.rootDirectory.stat();

      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      var rv = this.resolve(path);
      if (rv.entry instanceof FileSystem)
        return rv.entry.stat(rv.entry.rootPath.combine(Path.join(rv.suffixList)));

      if (!rv.isFinal) {
        return Promise.reject(new AxiomError.NotFound(
            'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
      }

      return rv.entry.stat();
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<undefined>}
     */
    JsFileSystem.prototype.mkdir = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      var parentPath = path.getParentPath();
      var targetName = path.getBaseName();

      var rv = this.resolve(parentPath);

      if (rv.entry instanceof FileSystem) {
        return rv.entry.mkdir(
            rv.entry.rootPath.combine(Path.join(rv.suffixList, targetName)));
      }

      if (!rv.isFinal) {
        return Promise.reject(new AxiomError.NotFound(
            'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
      }

      if (!rv.entry.hasMode('D'))
        return Promise.reject(new AxiomError.TypeMismatch('dir', parentPath.spec));

      return rv.entry.mkdir(targetName).then(function(jsdir) { return null; });
    };

    /**
     * @override
     * @param {Path} pathFrom
     * @param {Path} pathTo
     * @return {!Promise<undefined>}
     */
    JsFileSystem.prototype.alias = function(pathFrom, pathTo) {
      if (!this.isValidPath_(pathFrom)) {
        return Promise.reject(
          new AxiomError.Invalid('pathFrom', pathFrom.originalSpec));
      }
      var resolveFrom = this.resolve(pathFrom);

      if (!this.isValidPath_(pathTo)) {
        return Promise.reject(
          new AxiomError.Invalid('pathTo', pathTo.originalSpec));
      }
      var resolveTo = this.resolve(pathTo);

      if (!resolveFrom.isFinal) {
        if (resolveFrom.entry instanceof FileSystem) {
          // If the source resolution stopped on a file system, then the target
          // must stop on the same file system.  If not, this is an attempt to move
          // across file systems.
          if (resolveTo.entry == resolveFrom.entry) {
            return resolveFrom.entry.move(
                resolveFrom.entry.rootPath.combine(Path.join(
                    resolveFrom.suffixList)),
                resolveFrom.entry.rootPath.combine(Path.join(
                    resolveTo.suffixList)));
          }

          return Promise.reject(
            new AxiomError.Invalid('filesystem', pathFrom.originalSpec));
        }

        // Otherwise, if the source resolve was not final then the source path
        // doesn't exist.
        return Promise.reject(new AxiomError.NotFound(
            'path', Path.join(resolveTo.prefixList.join('/'),
                              resolveTo.suffixList[0])));
      }

      var targetName;

      // If the target path resolution stops (finally, or otherwise) on a
      // filesystem, that's trouble.
      if (resolveTo.entry instanceof FileSystem) {
        return Promise.reject(
          new AxiomError.Invalid('filesystem', pathTo.originalSpec));
      }

      if (resolveTo.isFinal) {
        // If target path resolution makes it to the end and finds something other
        // than a directory, that's trouble.
        if (!(resolveTo.entry instanceof JsDirectory)) {
          return Promise.reject(
            new AxiomError.Duplicate('pathTo', pathTo.originalSpec));
        }

        // But if path resolution stops on a directory, that just means we should
        // take the target name from the source.
        targetName = pathFrom.getBaseName();

      } else if (resolveTo.suffixList.length == 1) {
        // If the resolution was not final then there should be a single name in
        // the suffix list, which we'll use as the target name.
        targetName = pathFrom.getBaseName();

      } else {
        // If there's more than one item in the suffix list then the path refers
        // to non-existent directories.
        return Promise.reject(new AxiomError.NotFound(
            'path', Path.join(resolveFrom.prefixList.join('/'),
                              resolveFrom.suffixList[0])));
      }

      return resolveTo.entry.link(targetName, resolveFrom.entry);
    };

    /**
     * @override
     * @param {Path} fromPath
     * @param {Path} toPath
     * @return {!Promise<undefined>}
     */
    JsFileSystem.prototype.move = function(fromPath, toPath) {
      return this.alias(fromPath, toPath).then(
        function() {
          return this.unlink(fromPath);
        });
    };

    /**
     * @override
     * @param {Path} path
     * @return {Promise}
     */
    JsFileSystem.prototype.unlink = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      var parentPath = path.getParentPath();
      var targetName = path.getBaseName();

      var rv = this.resolve(parentPath);
      if (rv.entry instanceof FileSystem) {
        return rv.entry.unlink(
            rv.entry.rootPath.combine(Path.join(rv.suffixList, targetName)));
      }

      if (!rv.isFinal) {
        return Promise.reject(new AxiomError.NotFound(
            'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
      }

      if (rv.entry instanceof JsDirectory)
        return rv.entry.unlink(targetName);

      return Promise.reject(new AxiomError.TypeMismatch('dir', parentPath.spec));
    };

    /**
     * @override
     * @param {Path} path
     * @return {!Promise<!Object<string, StatResult>>}
     */
    JsFileSystem.prototype.list = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      var rv = this.resolve(path);
      if (rv.entry instanceof FileSystem) {
        return rv.entry.list(
            rv.entry.rootPath.combine(Path.join(rv.suffixList)));
      }

      if (!rv.isFinal) {
        return Promise.reject(new AxiomError.NotFound(
            'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
      }

      if (!(rv.entry instanceof JsDirectory)) {
        return Promise.reject(
          new AxiomError.TypeMismatch('dir', path.originalSpec));
      }

      return rv.entry.list();
    };

    /**
     * @override
     * @param {!Path} exePath  Path object pointing to the target executable.
     * @param {!Stdio} stdio
     * @param {Object|Arguments} arg  A plain JS object or Arguments instance.
     * @return {!Promise<!ExecuteContext>}
     */
    JsFileSystem.prototype.createExecuteContext = function(exePath, stdio, arg) {
      if (!this.isValidPath_(exePath))
        return Promise.reject(new AxiomError.Invalid('path', exePath.originalSpec));

      var rv = this.resolve(exePath);
      if (!rv.isFinal) {
        if (rv.entry instanceof FileSystem) {
          return rv.entry.createExecuteContext(
              rv.entry.rootPath.combine(Path.join(rv.suffixList)), stdio, arg);
        }

        return Promise.reject(new AxiomError.NotFound(
            'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
      }

      if (!(rv.entry instanceof JsExecutable)) {
        return Promise.reject(
            new AxiomError.TypeMismatch('executable', exePath.originalSpec));
      }

      if (!(arg instanceof Arguments)) {
        try {
          arg = new Arguments(rv.entry.signature, arg);
        } catch (ex) {
          return Promise.reject(ex);
        }
      }

      /** @type {!ExecuteContext} */
      var cx = new JsExecuteContext(this, stdio, exePath, rv.entry, arg);
      return Promise.resolve(cx);
    };

    /**
     * @override
     * @param {Path} path
     * @param {string|OpenMode} mode
     * @return {!Promise<!OpenContext>}
     */
    JsFileSystem.prototype.createOpenContext = function(path, mode) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      if (typeof mode == 'string')
        mode = OpenMode.fromString(mode);

      var rv = this.resolve(path);
      if (!rv.isFinal) {
        if (rv.entry instanceof FileSystem) {
          return rv.entry.createOpenContext(
              rv.entry.rootPath.combine(Path.join(rv.suffixList)), mode);
        } else if ((rv.entry instanceof JsDirectory) &&  mode.create &&
            (rv.suffixList.length == 1)) {
          // Create empty file if "create" mode
          var name = rv.suffixList[0];
          var value = new JsValue(this, 'RWK');
          rv.entry.link(name, value);
          rv.entry = value;
        } else {
          return Promise.reject(new AxiomError.NotFound(
              'path', Path.join(rv.prefixList.join('/'), rv.suffixList[0])));
        }
      }

      if (rv.entry instanceof JsValue) {
        // Truncate file (if previously existing)
        if (mode.write && mode.truncate) {
          rv.entry.value = null;
        }

        /** @type {!OpenContext} */
        var cx = new JsOpenContext(this, path, rv.entry, mode);
        return Promise.resolve(cx);
      }

      return Promise.reject(
        new AxiomError.TypeMismatch('openable', path.originalSpec));
    };

    /**
     * Installs a list of executables represented by an object into /exe.
     *
     * @override
     * @param {Object<string, function(JsExecuteContext)>} executables
     * @return {void}
     */
    JsFileSystem.prototype.install = function(obj) {
      var exeDirName = 'exe';
      var exePath = this.getPath(exeDirName);

      var result = this.rootDirectory.resolve(exePath);

      if (!result.isFinal)
        throw new AxiomError.Missing('path ' + exePath.spec);

      result.entry.install(obj);
    };
  }
);

//# sourceMappingURL=file_system.js.map
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

define(
  "axiom/fs/js/open_context",
  ["axiom/core/error", "axiom/fs/base/open_context", "axiom/fs/js/entry", "axiom/fs/js/value", "axiom/fs/path", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$base$open_context$$,
    axiom$fs$js$entry$$,
    axiom$fs$js$value$$,
    axiom$fs$path$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];
    var JsEntry;
    JsEntry = axiom$fs$js$entry$$["default"];
    var JsValue;
    JsValue = axiom$fs$js$value$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef JsFileSystem$$module$axiom$fs$js$file_system */
    var JsFileSystem;

    /** @typedef {OpenMode$$module$axiom$fs$open_mode} */
    var OpenMode;

    var JsOpenContext = function(jsfs, path, entry, mode) {
      OpenContext.call(this, jsfs, path, mode);

      /** @type {JsValue} */
      this.targetEntry = entry;
    };

    __es6_export__("JsOpenContext", JsOpenContext);
    __es6_export__("default", JsOpenContext);

    JsOpenContext.prototype = Object.create(OpenContext.prototype);

    /**
     * @override
     */
    JsOpenContext.prototype.open = function() {
      return OpenContext.prototype.open.call(this).then(function() {
        if (!(this.targetEntry instanceof JsValue)) {
          return Promise.reject(
              new AxiomError.TypeMismatch('openable', this.path.spec));
        }

        this.ready();
        return Promise.resolve();
      }.bind(this));
    };

    /**
     * @override
     */
    JsOpenContext.prototype.seek = function(offset, whence) {
      return OpenContext.prototype.seek.call(this, offset, whence).then(function() {
        if (!(this.targetEntry.mode & Path.Mode.K)) {
          return Promise.reject(
              new AxiomError.TypeMismatch('seekable', this.path.spec));
        }
      }.bind(this));
    };

    /**
     * @override
     */
    JsOpenContext.prototype.read = function(offset, whence, dataType) {
      return OpenContext.prototype.read.call(this, offset, whence, dataType).then(
          function(readResult) {
        if (!(this.targetEntry.mode & Path.Mode.R)) {
          return Promise.reject(
              new AxiomError.TypeMismatch('readable', this.path.spec));
        }

        return this.targetEntry.read(readResult);
      }.bind(this));
    };

    /**
     * @override
     */
    JsOpenContext.prototype.write = function(offset, whence, dataType, data) {
      return OpenContext.prototype.write.call(this, offset, whence, dataType, data)
          .then(function(writeResult) {
        if (!(this.targetEntry.mode & Path.Mode.W)) {
          return Promise.reject(
              new AxiomError.TypeMismatch('writable', this.path.spec));
        }

        return this.targetEntry.write(writeResult, data);
      }.bind(this));
    };
  }
);

//# sourceMappingURL=open_context.js.map
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

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
define("axiom/fs/js/resolve_result", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

 var BaseFileSystem;

 /** @typedef JsEntry$$module$axiom$fs$js$entry */
 var JsEntry;

 var JsResolveResult = function(prefixList, suffixList, entry) {
   this.prefixList = prefixList || [];
   this.suffixList = suffixList || [];
   this.entry = entry;

   this.isFinal = (entry && this.suffixList.length === 0);
 };

 __es6_export__("JsResolveResult", JsResolveResult);
 __es6_export__("default", JsResolveResult);
});

//# sourceMappingURL=resolve_result.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/js/value",
  ["axiom/core/error", "axiom/fs/data_type", "axiom/fs/base/open_context", "axiom/fs/js/entry", "exports"],
  function(
    axiom$core$error$$,
    axiom$fs$data_type$$,
    axiom$fs$base$open_context$$,
    axiom$fs$js$entry$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var DataType;
    DataType = axiom$fs$data_type$$["default"];
    var OpenContext;
    OpenContext = axiom$fs$base$open_context$$["default"];
    var JsEntry;
    JsEntry = axiom$fs$js$entry$$["default"];

    /** @typedef {JsFileSystem$$module$axiom$fs$js$file_system} */
    var JsFileSystem;

    /** @typedef {ReadResult$$module$axiom$fs$read_result} */
    var ReadResult;

    /** @typedef {WriteResult$$module$axiom$fs$write_result} */
    var WriteResult;

    var JsValue = function(jsfs, modeStr) {
      JsEntry.call(this, jsfs, modeStr);

      /** @type {*} */
      this.value = null;
    };

    __es6_export__("JsValue", JsValue);
    __es6_export__("default", JsValue);

    JsValue.prototype = Object.create(JsEntry.prototype);

    /**
     * @param {ReadResult} readResult
     * @return !Promise<!ReadResult>
     */
    JsValue.prototype.read = function(readResult) {
      readResult.dataType = DataType.Value;
      readResult.data = this.value;
      return Promise.resolve(readResult);
    };

    /**
     * @param {WriteResult} writeResult
     * @param {*} data
     * @return !Promise<!WriteResult>
     */
    JsValue.prototype.write = function(writeResult, data) {
      if (writeResult.dataType == DataType.Value ||
          writeResult.dataType == DataType.UTF8String) {
        this.value = data;
      } else if (typeof data == 'string' &&
          writeResult.dataType == DataType.Base64String) {
        this.value = window.btoa(data);
      } else {
        return Promise.reject(new AxiomError.Invalid('dataType',
                                                     writeResult.dataType));
      }

      writeResult.dataType = DataType.Value;
      return Promise.resolve(writeResult);
    };
  }
);

//# sourceMappingURL=value.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

define(
 "axiom/fs/nested_stdio",
 ["axiom/fs/stdio", "axiom/fs/stream/readable_stream_forwarder", "exports"],
 function(axiom$fs$stdio$$, axiom$fs$stream$readable_stream_forwarder$$, __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var Stdio;
  Stdio = axiom$fs$stdio$$["default"];
  var ReadableStreamForwarder;
  ReadableStreamForwarder = axiom$fs$stream$readable_stream_forwarder$$["default"];
  var NestedStdio = function(parentStdio) {
    // Note: we wrap stdin, ttyin and signal so that any "onData" event handler
    // added is scoped to the nested stdio lifetime.
    var stdin = new ReadableStreamForwarder(parentStdio.stdin);
    var signal = new ReadableStreamForwarder(parentStdio.signal);
    var ttyin = new ReadableStreamForwarder(parentStdio.ttyin);
    // Note: stdout, stderr and ttyout don't need to be wrapped as they don't
    // expose events.
    var stdout = parentStdio.stdout;
    var stderr = parentStdio.stderr;
    var ttyout = parentStdio.ttyout;
    Stdio.call(this, stdin, stdout, stderr, signal, ttyin, ttyout);

    /** @const @type {!Stdio} */
    this.parentStdio = parentStdio;
  };

  __es6_export__("NestedStdio", NestedStdio);
  __es6_export__("default", NestedStdio);

  NestedStdio.prototype = Object.create(Stdio.prototype);

  /**
   * @return {void}
   */
  NestedStdio.prototype.close = function() {
    this.stdin.close();
    this.signal.close();
  };
 }
);

//# sourceMappingURL=nested_stdio.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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


/** @constructor */
define("axiom/fs/open_mode", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var OpenMode = function() {
    this.create = false;
    this.exclusive = false;
    this.truncate = false;
    this.read = false;
    this.write = false;
  };

  __es6_export__("OpenMode", OpenMode);
  __es6_export__("default", OpenMode);

  /**
   * @param {string} str
   * @return {OpenMode}
   */
  OpenMode.fromString = function(str) {
    var m = new OpenMode();

    for (var i = 0; i < str.length; i++) {
      switch(str.substr(i, 1)) {
        case 'c':
        m.create = true;
        break;

        case 'e':
        m.exclusive = true;
        break;

        case 't':
        m.truncate = true;
        break;

        case 'r':
        m.read = true;
        break;

        case 'w':
        m.write = true;
        break;
      }
    }

    return m;
  };
});

//# sourceMappingURL=open_mode.js.map
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
 * @param {string} spec An absolute path specification ('root:path').
 */
define("axiom/fs/path", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var Path = function(spec) {
    this.originalSpec = spec; // the path you gave.

    /** @type {boolean} */
    this.isValid = true;  // True if the path was parsed, false if not.

    /** @type {string} */
    this.root = '';

    var colonIndex = spec.indexOf(Path.rootSeparator);
    if (colonIndex <= 0) {
      this.isValid = false;
      colonIndex = -1;
    } else {
      this.root = spec.substr(0, colonIndex);
    }

    var elements = [];

    // Convert Windows-style separators.
    spec = spec.replace(/\\/g, '/');

    var specNames = Path.split_(spec.substr(colonIndex + 1));
    if (!specNames) {
      this.isValid = false;
    } else {
      for (var i = 0; i < specNames.length; i++) {
        var name = specNames[i];
        if (!name || name == '.')
          continue;

        if (name == '..') {
          elements.pop();
        } else if (Path.reValidName.test(name)) {
          elements.push(name);
        } else {
          this.isValid = false;
          break;
        }
      }
    }

    /** @type {Array<string>} */
    this.elements = this.isValid ? elements : [];

    /** @type {string} */
    this.relSpec = Path.separator + this.elements.join(Path.separator);

    /** @type {string} */
    this.spec = this.root + Path.rootSeparator + this.relSpec;
  };

  __es6_export__("Path", Path);
  __es6_export__("default", Path);

  /**
   * @enum {number}
   * Enumeration of the supported file modes and their bit masks.
   */
  Path.Mode = {
    X: 0x01,  // executable
    W: 0x02,  // writable
    R: 0x04,  // readable
    D: 0x08,  // directory
    K: 0x10   // seekable
  };

  /**
   * Convert a mode string to a bit mask.
   *
   * @param {string} modeStr
   * @return {number}
   */
  Path.modeStringToInt = function(modeStr) {
    return modeStr.split('').reduce(
        function(p, v) {
          if (!(v in Path.Mode))
            throw new Error('Unknown mode char: ' + v);

          return p | Path.Mode[v];
        }, 0);
  };

  /**
   * Convert a mode bit mask to a string.
   *
   * @param {number} modeInt
   * @return {string}
   */
  Path.modeIntToString = function(modeInt) {
    var rv = '';
    Object.keys(Path.Mode).forEach(function(key) {
        if (modeInt & Path.Mode[key])
          rv += key;
      });
    return rv;
  };

  /**
   * RegExp matches valid path names.
   * @type {RegExp}
   */
  Path.reValidName = /[\w\d\-\.\,\+~\ ]/i;

  /**
   * @type {string}
   */
  Path.rootSeparator = ':';

  /**
   * @type {string}
   */
  Path.separator = '/';

  /**
   * Accepts varargs of strings or arrays of strings, and returns a string of
   * all path elements joined with Path.separator.
   *
   * @param {...(string|Array<string>)} var_args
   * @return {string}
   */
  Path.join = function(var_args) {
    var args = [];

    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] instanceof Array) {
        args[i] = arguments[i].join(Path.separator);
      } else {
        args[i] = arguments[i];
      }
    }

    return args.join(Path.separator).replace(/\/+/g, '/');
  };

  /**
   * @param {string} pwd
   * @param {string} pathSpec
   * @return {!Path}
   */
  Path.abs = function(pwd, pathSpec) {
    // If path is valid (and absolute), ignore pwd.
    var path = new Path(pathSpec);
    if (path.isValid) {
      return path;
    }

    // Parse pwd, fail if it is not valid.
    var pwdPath = new Path(pwd);
    if (!pwdPath.isValid) {
      // Return an invalid path
      return path;
    }

    if (pathSpec[0] == '/') {
      // Pathspec is absolute to the current filesystem.
      return new Path(pwdPath.root + Path.rootSeparator + pathSpec);
    }

    // Return pwd and pathSepc concatenated.
    if (pathSpec.substr(0, 2) == './')
      pathSpec = pathSpec.substr(2);

    return new Path(pwdPath.spec + '/' + pathSpec);
  };

  /**
   * @private
   * @param {string} spec
   * @return {Array<string>}
   */
  Path.split_ = function(spec) {
    return spec.split(/\//g);
  };

  /**
   * Combine the path with the given relative path spec.
   * @param {string} relSpec
   * @return {!Path}
   */
  Path.prototype.combine = function(relSpec) {
    return new Path(this.spec + Path.separator + relSpec);
  };

  /**
   * Return the parent spec, including the file system name.
   * @private
   * @return {string}
   */
  Path.prototype.getParentSpec_ = function() {
    return this.root + Path.rootSeparator + Path.separator +
        this.elements.slice(0, this.elements.length - 1).join(Path.separator);
  };

  /**
   * Return the parent path, including the file system name.
   * @return {Path}
   */
  Path.prototype.getParentPath = function() {
    if (this.elements.length === 0)
      return null;

    return new Path(this.getParentSpec_());
  };

  /**
   * Return the last component of the path.
   * @return {string}
   */
  Path.prototype.getBaseName = function() {
    return this.elements[this.elements.length - 1];
  };
});

//# sourceMappingURL=path.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

/** @typedef {SeekWhence$$module$axiom$fs$seek_whence} */
define("axiom/fs/read_result", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var SeekWhence;

  /** @typedef {DataType$$module$axiom$fs$data_type} */
  var DataType;

  var ReadResult = function(offset, whence, dataType) {
    /** @type {number} */
    this.offset = offset;

    /** @type {SeekWhence} */
    this.whence = whence;

    /** @type {DataType} */
    this.dataType = dataType;

    /** @type {*} */
    this.data = null;
  };

  __es6_export__("ReadResult", ReadResult);
  __es6_export__("default", ReadResult);
});

//# sourceMappingURL=read_result.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

/** @enum {string} */
define("axiom/fs/seek_whence", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var SeekWhence = {
    Begin: 'begin',
    Current: 'current',
    End: 'end'
  };

  __es6_export__("SeekWhence", SeekWhence);
  __es6_export__("default", SeekWhence);
});

//# sourceMappingURL=seek_whence.js.map
// Copyright 2015 Google Inc. All rights reserved.
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
 *
 * @param {Object} props File properties; allowed values are the same as this
 *   class' own properties.
 */
define("axiom/fs/stat_result", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

 var StatResult = function(props) {
   /** @type {number} */
   this.mode = props.mode || 0;
   /** @type {number} */
   this.mtime = props.mtime || 0;
   /** @type {number} */
   this.size = props.size || 0;
   /** @type {string} */
   this.mimeType = props.mimeType || '';
   /** @type {Object} */
   this.signature = props.signature || null;
 };

 __es6_export__("StatResult", StatResult);
 __es6_export__("default", StatResult);
});

//# sourceMappingURL=stat_result.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
define("axiom/fs/stdio", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

 var ReadableStream;

 /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
 var WritableStream;

 var Stdio = function(stdin, stdout, stderr, signal, ttyin, ttyout) {
   /** @type {!ReadableStream} */
   this.stdin = stdin;
   /** @type {!WritableStream} */
   this.stdout = stdout;
   /** @type {!WritableStream} */
   this.stderr = stderr;
   /** @type {!ReadableStream} */
   this.signal = signal;
   /** @type {!ReadableStream} */
   this.ttyin = ttyin;
   /** @type {!WritableStream} */
   this.ttyout = ttyout;
 };

 __es6_export__("Stdio", Stdio);
 __es6_export__("default", Stdio);
});

//# sourceMappingURL=stdio.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

define(
 "axiom/fs/stdio_source",
 ["axiom/fs/stdio", "axiom/fs/stream/memory_stream_buffer", "exports"],
 function(axiom$fs$stdio$$, axiom$fs$stream$memory_stream_buffer$$, __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var Stdio;
  Stdio = axiom$fs$stdio$$["default"];
  var MemoryStreamBuffer;
  MemoryStreamBuffer = axiom$fs$stream$memory_stream_buffer$$["default"];

  /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
  var ReadableStream;

  /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
  var WritableStream;

  var StdioSource = function() {
    /** @const @private @type {!MemoryStreamBuffer} */
    this.stdinBuffer_ = new MemoryStreamBuffer();
    /** @const @private @type {!MemoryStreamBuffer} */
    this.stdoutBuffer_ = new MemoryStreamBuffer();
    /** @const @private @type {!MemoryStreamBuffer} */
    this.stderrBuffer_ = new MemoryStreamBuffer();
    /** @const @private @type {!MemoryStreamBuffer} */
    this.signalBuffer_ = new MemoryStreamBuffer();
    /** @const @private @type {!MemoryStreamBuffer} */
    this.ttyinBuffer_ = new MemoryStreamBuffer();
    /** @const @private @type {!MemoryStreamBuffer} */
    this.ttyoutBuffer_ = new MemoryStreamBuffer();

    /** @const @type {!WritableStream} */
    this.stdin = this.stdinBuffer_.writableStream;
    /** @const @type {!ReadableStream} */
    this.stdout = this.stdoutBuffer_.readableStream;
    /** @const @type {!ReadableStream} */
    this.stderr = this.stderrBuffer_.readableStream;
    /** @const @type {!WritableStream} */
    this.signal = this.signalBuffer_.writableStream;
    /** @const @type {!WritableStream} */
    this.ttyin = this.ttyinBuffer_.writableStream;
    /** @const @type {!ReadableStream} */
    this.ttyout = this.ttyoutBuffer_.readableStream;

    /** @const @type {!Stdio} */
    this.stdio = new Stdio(
      this.stdinBuffer_.readableStream,
      this.stdoutBuffer_.writableStream,
      this.stderrBuffer_.writableStream,
      this.signalBuffer_.readableStream,
      this.ttyinBuffer_.readableStream,
      this.ttyoutBuffer_.writableStream);
  };

  __es6_export__("StdioSource", StdioSource);
  __es6_export__("default", StdioSource);
 }
);

//# sourceMappingURL=stdio_source.js.map
// Copyright 2015 Google Inc. All rights reserved.
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
 */
define("axiom/fs/stream/axiom_stream", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

 var AxiomStream = function() {
 };

 __es6_export__("AxiomStream", AxiomStream);
 __es6_export__("default", AxiomStream);
});

//# sourceMappingURL=axiom_stream.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/stream/channel",
  ["axiom/core/error", "axiom/core/event", "axiom/core/completer", "axiom/core/ephemeral", "axiom/fs/stream/message", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$event$$,
    axiom$core$completer$$,
    axiom$core$ephemeral$$,
    axiom$fs$stream$message$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var AxiomEvent;
    AxiomEvent = axiom$core$event$$["default"];
    var Completer;
    Completer = axiom$core$completer$$["default"];
    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];
    var Message;
    Message = axiom$fs$stream$message$$["default"];

    /** @typedef Transport$$module$axiom$fs$stream$transport */
    var Transport;

    var Channel = function(name, transport) {
      Ephemeral.call(this);

      /** @const @type {string}  */
      this.name = name;

      /** @const @type {Transport}  */
      this.transport_ = transport;

      /** @type {number} */
      this.requestId_ = 0;

      /** @const @type {!Object<string, {completer: Completer, message: Message}>}*/
      this.pendingMessages_ = {};

      /** @const @type {AxiomEvent} */
      this.onRequest = new AxiomEvent();

      this.transport_.onMessage.addListener(this.onTransportMessage_, this);
      this.transport_.onClose.addListener(this.onTransportClose_, this);
    };

    __es6_export__("Channel", Channel);
    __es6_export__("default", Channel);

    Channel.prototype = Object.create(Ephemeral.prototype);

    /**
     * Send a request to the peer, returning a promise that completes when the
     * response is available.
     * @param {Object} request
     * @return {Promise<Object>}
     */
    Channel.prototype.sendRequest = function(request) {
      this.requestId_++;
      var id = this.requestId_.toString();

      var message = new Message('ChannelRequest');
      message.subject = id;
      message.payload = request;

      var completer = new Completer();
      this.pendingMessages_[id] = {
        message: message,
        completer: completer
      };
      this.transport_.sendMessage(message);
      return completer.promise;
    };

    /**
     * Send a request to the peer, returning a promise that completes when the
     * response is available.
     * @param {string} subject
     * @param {Object} response
     * @return {Promise<Object>}
     */
    Channel.prototype.sendResponse = function(subject, response) {
      this.requestId_++;
      var id = this.requestId_.toString();

      var message = new Message('ChannelRequest');
      message.subject = id;
      message.regarding = subject;
      message.payload = response;

      this.transport_.sendMessage(message);
      return Promise.resolve();
    };

    /**
     * @param {Message} message
     * @return {void}
     */
    Channel.prototype.onTransportMessage_ = function(message) {
      if (!message.regarding) {
        this.onRequest.fire(message.subject, message.payload);
        return;
      }

      var id = message.regarding;
      var request = this.pendingMessages_[id];
      if (!request) {
        // TODO(rpaquay): Error handling.
        console.log('Warning: Received message regarding an unknown subject');
        return;
      }
      delete this.pendingMessages_[id];

      request.completer.resolve(message.payload);
    };

    /**
     * @return {void}
     */
    Channel.prototype.onTransportClose_ = function() {
      for(var id in this.pendingMessages_) {
        var request = this.pendingMessages_[id];
        delete this.pendingMessages_[id];
        request.completer.reject(
            new AxiomError.Runtime('Transport channel has closed.'));
      }
    };
  }
);

//# sourceMappingURL=channel.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/stream/extension_streams",
  ["axiom/core/error", "axiom/core/event", "axiom/fs/stream/queue", "axiom/fs/stream/readable_stream_source", "axiom/fs/stream/writable_stream_source", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$event$$,
    axiom$fs$stream$queue$$,
    axiom$fs$stream$readable_stream_source$$,
    axiom$fs$stream$writable_stream_source$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var AxiomEvent;
    AxiomEvent = axiom$core$event$$["default"];
    var Queue;
    Queue = axiom$fs$stream$queue$$["default"];
    var ReadableStreamSource;
    ReadableStreamSource = axiom$fs$stream$readable_stream_source$$["default"];
    var WritableStreamSource;
    WritableStreamSource = axiom$fs$stream$writable_stream_source$$["default"];

    /** @typedef function():void */
    var EventCallback;

    /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
    var ReadableStream;

    /** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
    var StreamsSource;

    /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
    var WritableStream;

    var ExtensionStreams = function() {
      /** @type {?string} */
      this.appId = null;
      /** @type {!AxiomEvent} */
      this.onData = new AxiomEvent();
      /** @type {!AxiomEvent} */
      this.onReadable = new AxiomEvent();
      /** @type {!AxiomEvent} */
      this.onClose = new AxiomEvent();
      /** @const @type {!ReadableStream} */
      this.readableStream = new ReadableStreamSource(this);
      /** @const @type {!WritableStream} */
      this.writableStream = new WritableStreamSource(this);

      /** @private @type {boolean} */
      this.paused_ = true;
      /** @const @private @type {Queue} */
      this.readQueue_ = new Queue();

    };

    __es6_export__("ExtensionStreams", ExtensionStreams);
    __es6_export__("default", ExtensionStreams);

    /**
     * @param {string} appId
     * @return {Promise}
     */
    ExtensionStreams.prototype.open = function(appId) {
      /*%*/ console.log("open!" + appId); /*%*/
      this.appId = appId
      //TODO: Verify extension exists (send message?)

      return Promise.resolve();
    };

    /**
     * @return {void}
     */
    ExtensionStreams.prototype.close = function() {
      /*%*/ console.log("close!"); /*%*/
      //TODO: Implement
    };

    /**
     * @return {void}
     */
    ExtensionStreams.prototype.pause = function() {
      /*%*/ console.log("pause!"); /*%*/
      this.paused_ = true;
    };

    /**
     * @return {void}
     */
    ExtensionStreams.prototype.resume = function() {
      /*%*/ console.log("resume!"); /*%*/
      this.paused_ = false;
    };

    /**
     * Consume one event from the stream. Return undefined if the
     * stream is empty.
     *
     * @return {*}
     */
    ExtensionStreams.prototype.read = function() {
      /*%*/ console.log("read!"); /*%*/
      return this.read_();
    };

    /**
     * Write data into the stream (for implementers of the stream only).
     * Invoke the "onData" callback for all pending events if the callback is set.
     *
     * @param {!*} value
     * @param {EventCallback=} opt_callback
     * @return {void}
     */
    ExtensionStreams.prototype.write = function(value, opt_callback) {
      /*%*/ console.log("write!" + value); /*%*/
      if (!this.appId)
          throw new AxiomError.Runtime('Cannot write: extension is not open.');

      /** @type {!string} */
      var appId = this.appId;

      chrome.runtime.sendMessage(
        appId,
        value.toString(),
        {}, // options
        function(response) {
          if (chrome.runtime.lastError) {
            this.onStreamError_(chrome.runtime.lastError);
          } else if (!response.success) {
            this.onStreamError_(response.error);
          } else {
            this.onExtensionMessage_(response.result);
          }
        }.bind(this)
      )
    };

    /**
     * @return {void}
     */
    ExtensionStreams.prototype.onStreamError_ = function(error) {
      //TODO Wrap error in AxiomError
    };

    /**
     * @return {void}
     */
    ExtensionStreams.prototype.onExtensionMessage_ = function(event) {
      /*%*/ console.log("onExtensionMessage_!" + event); /*%*/
      if (this.paused_) {
        this.onReadable.fire();
      } else {
        this.flushReadQueue_();
      }
    };

    /**
     * @return {void}
     */
    ExtensionStreams.prototype.flushReadQueue_ = function() {
      while (!this.paused_) {
        var item = this.read_();
        if (!item)
          break;

        this.onData.fire(item);
      }
    };

    /**
     * Consume one event from the stream. Return undefined if the
     * stream is empty.
     *
     * @return {*}
     */
    ExtensionStreams.prototype.read_ = function() {
      return this.readQueue_.dequeue();
    };
  }
);

//# sourceMappingURL=extension_streams.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/stream/memory_stream_buffer",
  ["axiom/core/error", "axiom/core/event", "axiom/fs/stream/queue", "axiom/fs/stream/readable_stream_source", "axiom/fs/stream/writable_stream_source", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$event$$,
    axiom$fs$stream$queue$$,
    axiom$fs$stream$readable_stream_source$$,
    axiom$fs$stream$writable_stream_source$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var AxiomEvent;
    AxiomEvent = axiom$core$event$$["default"];
    var Queue;
    Queue = axiom$fs$stream$queue$$["default"];
    var ReadableStreamSource;
    ReadableStreamSource = axiom$fs$stream$readable_stream_source$$["default"];
    var WritableStreamSource;
    WritableStreamSource = axiom$fs$stream$writable_stream_source$$["default"];

    /** @typedef function():void */
    var EventCallback;

    /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
    var ReadableStream;

    /** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
    var StreamsSource;

    /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
    var WritableStream;

    /**
     * Event value + associated callback
     * @constructor
     * @param {!*} value
     * @param {!EventCallback} callback
     */
    var EventWithCallback = function(value, callback) {
      this.value = value;
      this.callback = callback;
    };

    var MemoryStreamBuffer = function() {
      /** @private @type {boolean} */
      this.paused_ = true;
      /** @const @private @type {Queue} */
      this.events_ = new Queue();
      /** @type {!AxiomEvent} */
      this.onData = new AxiomEvent();
      /** @type {!AxiomEvent} */
      this.onReadable = new AxiomEvent();
      /** @type {!AxiomEvent} */
      this.onClose = new AxiomEvent();
      /** @const @type {!ReadableStream} */
      this.readableStream = new ReadableStreamSource(this);
      /** @const @type {!WritableStream} */
      this.writableStream = new WritableStreamSource(this);
    };

    __es6_export__("MemoryStreamBuffer", MemoryStreamBuffer);
    __es6_export__("default", MemoryStreamBuffer);

    /**
     * @return {void}
     */
    MemoryStreamBuffer.prototype.pause = function() {
      this.paused_ = true;
    };

    /**
     * @return {void}
     */
    MemoryStreamBuffer.prototype.resume = function() {
      this.paused_ = false;
      this.flushEvents_();
    };

    /**
     * Consume one event from the stream. Return undefined if the
     * stream is empty.
     *
     * @return {*}
     */
    MemoryStreamBuffer.prototype.read = function() {
      if (!this.paused_) {
        throw new AxiomError.Runtime('Cannot read: stream must be paused');
      }
      return this.read_();
    };

    /**
     * Write data into the stream (for implementers of the stream only).
     * Invoke the "onData" callback for all pending events if the callback is set.
     *
     * @param {!*} value
     * @param {EventCallback=} opt_callback
     * @return {void}
     */
    MemoryStreamBuffer.prototype.write = function(value, opt_callback) {
      var item = value;
      if (opt_callback) {
        item = new EventWithCallback(value, opt_callback);
      }
      this.events_.enqueue(item);
      if (this.paused_) {
        this.onReadable.fire();
      } else {
        this.flushEvents_();
      }
    };

    /**
     * @return {void}
     */
    MemoryStreamBuffer.prototype.flushEvents_ = function() {
      while (!this.paused_) {
        var item = this.read_();
        if (!item)
          break;

        this.onData.fire(item);
      }
    };

    /**
     * Consume one event from the stream. Return undefined if the
     * stream is empty.
     *
     * @return {*}
     */
    MemoryStreamBuffer.prototype.read_ = function() {
      var item = this.events_.dequeue();
      if (item instanceof EventWithCallback) {
        item.callback();
        return item.value;
      } else {
        return item;
      }
    };
  }
);

//# sourceMappingURL=memory_stream_buffer.js.map
// Copyright 2015 Google Inc. All rights reserved.
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
 * Abstraction over a message, either a request or a response, sent over
 * a transport.
 *
 * @constructor
 *
 * @param {string} name
 * @param {?string} opt_subject
 */
define("axiom/fs/stream/message", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

 var Message = function(name) {
   /** @type {string} */
   this.name = name;
   /** @type {string} */
   this.subject = '';
   /** @type {string} */
   this.regarding = '';
   /** @type {*} */
   this.payload = {};
 };

 __es6_export__("Message", Message);
 __es6_export__("default", Message);
});

//# sourceMappingURL=message.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/stream/node_web_socket_streams",
  ["axiom/core/error", "axiom/core/event", "axiom/fs/stream/queue", "axiom/fs/stream/readable_stream_source", "axiom/fs/stream/writable_stream_source", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$event$$,
    axiom$fs$stream$queue$$,
    axiom$fs$stream$readable_stream_source$$,
    axiom$fs$stream$writable_stream_source$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var AxiomEvent;
    AxiomEvent = axiom$core$event$$["default"];
    var Queue;
    Queue = axiom$fs$stream$queue$$["default"];
    var ReadableStreamSource;
    ReadableStreamSource = axiom$fs$stream$readable_stream_source$$["default"];
    var WritableStreamSource;
    WritableStreamSource = axiom$fs$stream$writable_stream_source$$["default"];

    /** @typedef function():void */
    var EventCallback;

    /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
    var ReadableStream;

    /** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
    var StreamsSource;

    /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
    var WritableStream;

    /**
     * Event value + associated callback
     * @constructor
     * @param {!*} value
     * @param {!EventCallback} callback
     */
    var EventWithCallback = function(value, callback) {
      this.value = value;
      this.callback = callback;
    };

    var NodeWebSocketStreams = function(webSocket) {
      /** @type {*} */
      this.webSocket = webSocket;
      /** @private @type {boolean} */
      this.paused_ = true;
      /** @const @private @type {Queue} */
      this.readQueue_ = new Queue();
      /** @const @private @type {Queue} */
      this.writeQueue_ = new Queue();
      /** @type {!AxiomEvent} */
      this.onData = new AxiomEvent();
      /** @type {!AxiomEvent} */
      this.onReadable = new AxiomEvent();
      /** @type {!AxiomEvent} */
      this.onClose = new AxiomEvent();
      /** @const @type {!ReadableStream} */
      this.readableStream = new ReadableStreamSource(this);
      /** @const @type {!WritableStream} */
      this.writableStream = new WritableStreamSource(this);

      this.webSocket.on('message', function (message) {
        this.onSocketMessage_(message);
      }.bind(this));

      this.webSocket.on('close', function () {
        this.onSocketClose_();
      }.bind(this));
    };

    __es6_export__("NodeWebSocketStreams", NodeWebSocketStreams);
    __es6_export__("default", NodeWebSocketStreams);

    /**
     * @return {void}
     */
    NodeWebSocketStreams.prototype.close = function() {
      this.webSocket.close();
    };

    /**
     * @return {void}
     */
    NodeWebSocketStreams.prototype.pause = function() {
      this.paused_ = true;
    };

    /**
     * @return {void}
     */
    NodeWebSocketStreams.prototype.resume = function() {
      this.paused_ = false;
      this.flushReadQueue_();
    };

    /**
     * Consume one event from the stream. Return undefined if the
     * stream is empty.
     *
     * @return {*}
     */
    NodeWebSocketStreams.prototype.read = function() {
      if (!this.paused_) {
        throw new AxiomError.Runtime('Cannot read: stream must be paused');
      }
      return this.read_();
    };

    /**
     * Write data into the stream (for implementers of the stream only).
     * Invoke the "onData" callback for all pending events if the callback is set.
     *
     * @param {!*} value
     * @param {EventCallback=} opt_callback
     * @return {void}
     */
    NodeWebSocketStreams.prototype.write = function(value, opt_callback) {
      switch(this.webSocket.readyState) {
        case 0 /* CONNECTING */:
        case 1 /* OPEN */:
          var item = value;
          if (opt_callback) {
            item = new EventWithCallback(value, opt_callback);
          }
          this.writeQueue_.enqueue(item);
          this.flushWriteQueue_();
          break;

        case 2 /* CLOSING */:
        case 3 /* CLOSE */:
        default:
          throw new AxiomError.Runtime('Cannot write: the web socket is closed.');
      }
    };

    /**
     * @return {void}
     */
    NodeWebSocketStreams.prototype.onSocketClose_ = function() {
      this.onClose.fire();
    };

    /**
     * @return {void}
     */
    NodeWebSocketStreams.prototype.onSocketMessage_ = function(data) {
      this.readQueue_.enqueue(data);
      if (this.paused_) {
        this.onReadable.fire();
      } else {
        this.flushReadQueue_();
      }
    };

    /**
     * @return {void}
     */
    NodeWebSocketStreams.prototype.flushReadQueue_ = function() {
      while (!this.paused_) {
        var item = this.read_();
        if (!item)
          break;

        this.onData.fire(item);
      }
    };

    /**
     * @return {void}
     */
    NodeWebSocketStreams.prototype.flushWriteQueue_ = function() {
      while(this.webSocket.readyState === 1 /* OPEN */) {
        var item = this.writeQueue_.dequeue();
        if (!item)
          break;

        if (item instanceof EventWithCallback) {
          this.webSocket.send(/** @type {string} */(item.value));
          // Note: Websocket API does not provide a notification when data is
          // actually sent to the peer, so we invoke the callback right away.
          item.callback();
        } else {
          this.webSocket.send(/** @type {string} */(item));
        }
      }
    };

    /**
     * Consume one event from the stream. Return undefined if the
     * stream is empty.
     *
     * @return {*}
     */
    NodeWebSocketStreams.prototype.read_ = function() {
      return this.readQueue_.dequeue();
    };
  }
);

//# sourceMappingURL=node_web_socket_streams.js.map
// Copyright 2015 Google Inc. All rights reserved.
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
 * Simple abstraction over a FIFO queue.
 * Current implementation is O(n) when dequeuing. It could be replaced
 * with a double stack, a sliding window array, a double linked list, etc.
 *
 * @constructor
 */
define("axiom/fs/stream/queue", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

 var Queue = function() {
   /** @const @private @type {Array<*>} */
   this.items_ = [];
 };

 __es6_export__("Queue", Queue);
 __es6_export__("default", Queue);

 /**
  * Add an element to the queue.
  *
  * @param {*} value
  * @return {void}
  */
 Queue.prototype.enqueue = function(value) {
   this.items_.push(value);
 };

 /**
  * Remove and return first element of the queue. Return undefined if the queue
  * is empty.
  *
  * @return {*}
  */
 Queue.prototype.dequeue = function() {
   return this.items_.shift();
 };

 /**
  * Return true iff the queue is empty.
  * @return {boolean}
  */
 Queue.prototype.empty = function() {
   return this.items_.length === 0;
 };
});

//# sourceMappingURL=queue.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
 "axiom/fs/stream/readable_stream",
 ["axiom/core/event", "exports"],
 function(axiom$core$event$$, __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var AxiomEvent;
  AxiomEvent = axiom$core$event$$["default"];
  var ReadableStream = function() {
    /**
     * When the stream is in flowing mode, onData events are fired with values
     * as soon as data is available.
     *
     * @type {!AxiomEvent}
     */
    this.onData = new AxiomEvent();
    /**
     * When the stream is in paused mode, onReablable events are fired when
     * data is available to read.
     *
     * @type {!AxiomEvent}
     */
    this.onReadable = new AxiomEvent();
    /**
     * Emitted when the underlying resource (for example, the backing file
     * descriptor) has been closed. Not all streams will emit this.
     *
     * @type {!AxiomEvent}
     */
    this.onClose = new AxiomEvent();
  };

  __es6_export__("ReadableStream", ReadableStream);

  /**
   * Switch the stream to paused mode, no more onData events are fired.
   *
   * @return {void}
   */
  ReadableStream.prototype.pause = function() {};

  /**
   * Switch the stream to flowing mode, onData events are fired when data is
   * available.
   *
   * @return {void}
   */
  ReadableStream.prototype.resume = function() {};

  /**
   * When the stream is in paused mode, read one value from the stream, or return
   * undefined when the stream is empty.
   *
   * @return {*}
   */
  ReadableStream.prototype.read = function() {};
 }
);

//# sourceMappingURL=readable_stream.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
 "axiom/fs/stream/readable_stream_forwarder",
 ["axiom/core/event", "axiom/fs/stream/axiom_stream", "exports"],
 function(axiom$core$event$$, axiom$fs$stream$axiom_stream$$, __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var AxiomEvent;
  AxiomEvent = axiom$core$event$$["default"];
  var AxiomStream;
  AxiomStream = axiom$fs$stream$axiom_stream$$["default"];

  /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
  var ReadableStream;

  var ReadableStreamForwarder = function(stream) {
    AxiomStream.call(this);
    /** type {!AxiomEvent} */
    this.onData = new AxiomEvent();
    /** type {!AxiomEvent} */
    this.onReadable = new AxiomEvent();
    /** type {!AxiomEvent} */
    this.onClose = new AxiomEvent();
    /** @type {!ReadableStream} */
    this.stream = stream;
    this.stream.onData.addListener(this.onDataCallback_, this);
    this.stream.onReadable.addListener(this.onReadableCallback_, this);
    this.stream.onClose.addListener(this.onCloseCallback_, this);
  };

  __es6_export__("ReadableStreamForwarder", ReadableStreamForwarder);
  __es6_export__("default", ReadableStreamForwarder);

  ReadableStreamForwarder.prototype = Object.create(AxiomStream.prototype);

  /**
   * @return {void}
   */
  ReadableStreamForwarder.prototype.close = function() {
    this.stream.onData.removeListener(this.onDataCallback_, this);
    this.stream.onReadable.removeListener(this.onReadableCallback_, this);
    this.stream.onClose.removeListener(this.onCloseCallback_, this);
  };

  /**
   * @private
   * @param {*} value
   * @return {void}
   */
  ReadableStreamForwarder.prototype.onDataCallback_ = function(value) {
    this.onData.fire(value);
  };

  /**
   * @private
   * @return {void}
   */
  ReadableStreamForwarder.prototype.onReadableCallback_ = function() {
    this.onReadable.fire();
  };

  /**
   * @private
   * @return {void}
   */
  ReadableStreamForwarder.prototype.onCloseCallback_ = function() {
    this.onClose.fire();
  };

  /**
   * @override
   * @return {void}
   */
  ReadableStreamForwarder.prototype.pause = function() {
    return this.stream.pause();
  };

  /**
   * @override
   * @return {void}
   */
  ReadableStreamForwarder.prototype.resume = function() {
    return this.stream.resume();
  };

  /**
   * @override
   * @return {*}
   */
  ReadableStreamForwarder.prototype.read = function() {
    return this.stream.read();
  };
 }
);

//# sourceMappingURL=readable_stream_forwarder.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
 "axiom/fs/stream/readable_stream_source",
 ["axiom/core/error", "axiom/core/event", "axiom/fs/stream/axiom_stream", "exports"],
 function(
  axiom$core$error$$,
  axiom$core$event$$,
  axiom$fs$stream$axiom_stream$$,
  __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var AxiomError;
  AxiomError = axiom$core$error$$["default"];
  var AxiomEvent;
  AxiomEvent = axiom$core$event$$["default"];
  var AxiomStream;
  AxiomStream = axiom$fs$stream$axiom_stream$$["default"];

  /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
  var ReadableStream;

  /** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
  var StreamsSource;

  var ReadableStreamSource = function(source) {
    AxiomStream.call(this);
    /** @const @private @type {StreamsSource} */
    this.source_ = source;
    /** @const @type {!AxiomEvent} */
    this.onData = source.onData;
    /** @const @type {!AxiomEvent} */
    this.onReadable = source.onReadable;
    /** @type {!AxiomEvent} */
    this.onClose = source.onClose;
  };

  __es6_export__("ReadableStreamSource", ReadableStreamSource);
  __es6_export__("default", ReadableStreamSource);

  ReadableStreamSource.prototype = Object.create(AxiomStream.prototype);

  /**
   * @override
   * @return {void}
   */
  ReadableStreamSource.prototype.pause = function() {
    return this.source_.pause();
  };

  /**
   * @override
   * @return {void}
   */
  ReadableStreamSource.prototype.resume = function() {
    return this.source_.resume();
  };

  /**
   * @override
   * @return {*}
   */
  ReadableStreamSource.prototype.read = function() {
    return this.source_.read();
  };
 }
);

//# sourceMappingURL=readable_stream_source.js.map
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

define(
  "axiom/fs/stream/skeleton_file_system",
  ["axiom/core/error", "axiom/core/ephemeral", "axiom/fs/path", "exports"],
  function(axiom$core$error$$, axiom$core$ephemeral$$, axiom$fs$path$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Ephemeral;
    Ephemeral = axiom$core$ephemeral$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];

    /** @typedef Channel$$module$axiom$fs$stream$channel */
    var Channel;

    /** @typedef FileSystem$$module$axiom$fs$base$file_system */
    var FileSystem;

    /** @typedef {StatResult$$module$axiom$fs$stat_result} */
    var StatResult;

    var SkeletonFileSystem = function(description, fileSystem, channel) {
      Ephemeral.call(this);

      /**
       * Instance description (for debugging/logging purposes)
       * @type {string }
       */
      this.description = description;

      /**
       * @type {?string} Name of the remote file system.
       */
      this.remoteName_ = null;

      /** @const @private @type {!FileSystem} */
      this.fileSystem_ = fileSystem;

      /** @const @private @type {!Channel} */
      this.channel_ = channel;

      this.channel_.onRequest.addListener(this.onRequest_, this);
    };

    __es6_export__("SkeletonFileSystem", SkeletonFileSystem);
    __es6_export__("default", SkeletonFileSystem);

    SkeletonFileSystem.prototype = Object.create(Ephemeral.prototype);

    /**
     * Convert a path from the remote peer to a path on the local file system.
     * @param {string} Path
     * @return {!Path}
     */
    SkeletonFileSystem.prototype.convertPath_ = function(pathSpec) {
      var path = new Path(pathSpec);
      if (!path.isValid) {
        throw new AxiomError.Invalid('path', path.originalSpec);
      }

      if (path.root !== this.remoteName_) {
        throw new AxiomError.Invalid('path', path.originalSpec);
      }

      return this.fileSystem_.rootPath.combine(path.relSpec);
    };

    /**
     * @param {string} subject
     * @param {Object} request
     * @return {void}
     */
    SkeletonFileSystem.prototype.onRequest_ = function(subject, request) {
      console.log('Processing request', request);
      new Promise(
        function(resolve, reject) {
          // Note: We run this inside a promise so that any exception thrown
          // can be caught in the "catch" at the end of this function.
          this.processRequest(request).then(resolve, reject);
        }.bind(this)
      ).then(
        function(response) {
          this.channel_.sendResponse(subject, response);
        }.bind(this)
      ).catch(
        function(error) {
          var errorToObject = function(err) {
            var plainObject = {};
            Object.getOwnPropertyNames(err).forEach(function(key) {
              plainObject[key] = err[key];
            });
            return plainObject;
          };
          var errorObj = errorToObject(error);
          console.log('Error processing request: ', errorObj);
          this.channel_.sendResponse(subject, {error: errorObj});
        }.bind(this)
      );
    };

    /**
     * @param {Object} request
     * @return {Promise}
     */
    SkeletonFileSystem.prototype.processRequest = function(request) {
      if (request.cmd === 'connect') {
        if (this.remoteName_) {
          throw new AxiomError.Runtime('Connection already established');
        }
        this.remoteName_ = request.name;
        return Promise.resolve();
      } else if (request.cmd === 'list') {
        var path = this.convertPath_(request.path);
        return this.fileSystem_.list(path).then(
          function(result) {
            return Promise.resolve({entries: result});
          }
        );
      } else if (request.cmd === 'stat') {
        var path = this.convertPath_(request.path);
        return this.fileSystem_.stat(path).then(
          function(result) {
            return Promise.resolve({statResult: result});
          }
        );
      } else {
        return Promise.reject(new AxiomError.Invalid('command', request.cmd));
      }
    };
  }
);

//# sourceMappingURL=skeleton_file_system.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
 "axiom/fs/stream/streams_source",
 ["axiom/core/event", "exports"],
 function(axiom$core$event$$, __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var AxiomEvent;
  AxiomEvent = axiom$core$event$$["default"];

  /** @typedef function():void */
  var EventCallback;

  var StreamsSource = function() {
    /**
     * When the stream is in flowing mode, onData events are fired with values
     * as soon as data is available.
     *
     * @type {!AxiomEvent}
     */
    this.onData = new AxiomEvent();
    /**
     * When the stream is in paused mode, onReablable events are fired when
     * data is available to read.
     *
     * @type {!AxiomEvent}
     */
    this.onReadable = new AxiomEvent();
    /**
     * Emitted when the underlying resource (for example, the backing file
     * descriptor) has been closed. Not all streams will emit this.
     *
     * @type {!AxiomEvent}
     */
    this.onClose = new AxiomEvent();
  };

  __es6_export__("StreamsSource", StreamsSource);

  /**
   * Switch the stream to paused mode, no more onData events are fired.
   *
   * @return {void}
   */
  StreamsSource.prototype.pause = function() {};

  /**
   * Switch the stream to flowing mode, onData events are fired when data is
   * available.
   *
   * @return {void}
   */
  StreamsSource.prototype.resume = function() {};

  /**
   * When the stream is in paused mode, read one value from the stream, or return
   * undefined when the stream is empty.
   *
   * @return {*}
   */
  StreamsSource.prototype.read = function() {};

  /**
   * Write an event to the stream.
   *
   * @param {!*} value
   * @param {EventCallback=} opt_callback
   * @return {void}
   */
  StreamsSource.prototype.write = function(value, opt_callback) {};
 }
);

//# sourceMappingURL=streams_source.js.map
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

define(
  "axiom/fs/stream/stub_file_system",
  ["axiom/core/error", "axiom/fs/base/file_system", "exports"],
  function(axiom$core$error$$, axiom$fs$base$file_system$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var FileSystem;
    FileSystem = axiom$fs$base$file_system$$["default"];

    /** @typedef Channel$$module$axiom$fs$stream$channel */
    var Channel;

    /** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
    var FileSystemManager;

    /** @typedef {Path$$module$axiom$fs$path} */
    var Path;

    /** @typedef {StatResult$$module$axiom$fs$stat_result} */
    var StatResult;

    var StubFileSystem = function(fileSystemManager, name, channel) {
      FileSystem.call(this, fileSystemManager, name);

      /** @const @private @type {Channel} */
      this.channel_ = channel;

      /** @type {string} */
      this.description = 'remote file system';
    };

    __es6_export__("StubFileSystem", StubFileSystem);
    __es6_export__("default", StubFileSystem);

    StubFileSystem.prototype = Object.create(FileSystem.prototype);

    /**
     * @private
     * @param {Path} path
     * @return {!boolean}
     */
    StubFileSystem.prototype.isValidPath_ = function(path) {
      return !(!path || !path.isValid || path.root !== this.name);
    };

    /**
     * Send a request to the peer, returning a promise that completes when the
     * response is available.
     * @param {Object} request
     * @return {Promise<Object>}
     */
    StubFileSystem.prototype.sendRequest_ = function(request) {
      return this.channel_.sendRequest(request).then(
        function(response) {
          if (response && response.error)
            return Promise.reject(response.error);
          return response;
        }.bind(this)
      );
    };

    /**
     * @return {Promise}
     */
    StubFileSystem.prototype.connect = function() {
      return this.sendRequest_({
        cmd: 'connect',
        name: this.name
      });
    };

    /**
     * @param {Path} path
     * @return {!Promise<!Object<string, StatResult>>}
     */
    StubFileSystem.prototype.list = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      return this.sendRequest_({
        cmd: 'list',
        path: path.spec,
      }).then(
        function(response) {
          var result = {};
          for(var name in response.entries) {
            result[name] = response.entries[name];
          }
          return result;
        }.bind(this)
      );
    };

    /**
     * @param {Path} path
     * @return {!Promise<!StatResult>}
     */
    StubFileSystem.prototype.stat = function(path) {
      if (!this.isValidPath_(path))
        return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

      return this.sendRequest_({
        cmd: 'stat',
        path: path.spec,
      }).then(
        function(response) {
          return response.statResult;
        }.bind(this)
      );
    };
  }
);

//# sourceMappingURL=stub_file_system.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
 "axiom/fs/stream/transport",
 ["axiom/core/event", "axiom/core/ephemeral", "exports"],
 function(axiom$core$event$$, axiom$core$ephemeral$$, __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var AxiomEvent;
  AxiomEvent = axiom$core$event$$["default"];
  var Ephemeral;
  Ephemeral = axiom$core$ephemeral$$["default"];

  /** @typedef Message$$module$axiom$fs$stream$message */
  var Message;

  /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
  var ReadableStream;

  /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
  var WritableStream;

  var Transport = function(name, inStream, outStream) {
    Ephemeral.call(this);

    /** @const @type {ReadableStream}  */
    this.inStream_ = inStream;

    /** @const @type {WritableStream} */
    this.outStream_ = outStream;

    /** @const @type {AxiomEvent} */
    this.onMessage = new AxiomEvent();

    this.inStream_.onData.addListener(this.onStreamData_, this);
    this.inStream_.onClose.addListener(this.onStreamClose_, this);

    this.ready();
  };

  __es6_export__("Transport", Transport);
  __es6_export__("default", Transport);

  Transport.prototype = Object.create(Ephemeral.prototype);

  /**
   * Sends a message to the peer.
   * @param {Message} message
   * @return {void}
   */
  Transport.prototype.sendMessage = function(message) {
    this.outStream_.write(JSON.stringify(message));
  };

  /**
   * @param {*} data
   * @return {void}
   */
  Transport.prototype.onStreamData_ = function(data) {
    var message = JSON.parse(/** @type {string} */(data));
    this.onMessage.fire(message);
  };

  /**
   * @return {void}
   */
  Transport.prototype.onStreamClose_ = function() {
    this.closeOk();
  };
 }
);

//# sourceMappingURL=transport.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
  "axiom/fs/stream/web_socket_streams",
  ["axiom/core/error", "axiom/core/event", "axiom/fs/stream/queue", "axiom/fs/stream/readable_stream_source", "axiom/fs/stream/writable_stream_source", "exports"],
  function(
    axiom$core$error$$,
    axiom$core$event$$,
    axiom$fs$stream$queue$$,
    axiom$fs$stream$readable_stream_source$$,
    axiom$fs$stream$writable_stream_source$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var AxiomEvent;
    AxiomEvent = axiom$core$event$$["default"];
    var Queue;
    Queue = axiom$fs$stream$queue$$["default"];
    var ReadableStreamSource;
    ReadableStreamSource = axiom$fs$stream$readable_stream_source$$["default"];
    var WritableStreamSource;
    WritableStreamSource = axiom$fs$stream$writable_stream_source$$["default"];

    /** @typedef function():void */
    var EventCallback;

    /** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
    var ReadableStream;

    /** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
    var StreamsSource;

    /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
    var WritableStream;

    /**
     * Event value + associated callback
     * @constructor
     * @param {!*} value
     * @param {!EventCallback} callback
     */
    var EventWithCallback = function(value, callback) {
      this.value = value;
      this.callback = callback;
    };

    var WebSocketStreams = function() {
      /** @type {WebSocket} */
      this.webSocket = null;
      /** @private @type {boolean} */
      this.paused_ = true;
      /** @const @private @type {Queue} */
      this.readQueue_ = new Queue();
      /** @const @private @type {Queue} */
      this.writeQueue_ = new Queue();
      /** @type {!AxiomEvent} */
      this.onData = new AxiomEvent();
      /** @type {!AxiomEvent} */
      this.onReadable = new AxiomEvent();
      /** @type {!AxiomEvent} */
      this.onClose = new AxiomEvent();
      /** @const @type {!ReadableStream} */
      this.readableStream = new ReadableStreamSource(this);
      /** @const @type {!WritableStream} */
      this.writableStream = new WritableStreamSource(this);
    };

    __es6_export__("WebSocketStreams", WebSocketStreams);
    __es6_export__("default", WebSocketStreams);

    /**
     * @param {string} url
     * @return {Promise}
     */
    WebSocketStreams.prototype.open = function(url) {
      return new Promise(function(resolve, reject) {
        this.webSocket = new WebSocket(url);

        this.webSocket.onopen = function() {
          this.webSocket.onmessage = this.onSocketMessage_.bind(this);
          this.webSocket.onerror = this.onSocketError_.bind(this);
          this.webSocket.onclose = this.onSocketClose_.bind(this);
          this.flushWriteQueue_();
          resolve();
        }.bind(this);

        this.webSocket.onclose = function(ev) {
          reject(new AxiomError.Runtime(
              'Error opening WebSocket (error code: ' + ev.code + ')'));
        }.bind(this);

      }.bind(this));
    };

    /**
     * @return {void}
     */
    WebSocketStreams.prototype.close = function() {
      if (!this.webSocket)
        return;
      this.webSocket.close();
      this.webSocket = null;
    };

    /**
     * @return {void}
     */
    WebSocketStreams.prototype.pause = function() {
      this.paused_ = true;
    };

    /**
     * @return {void}
     */
    WebSocketStreams.prototype.resume = function() {
      this.paused_ = false;
      this.flushReadQueue_();
    };

    /**
     * Consume one event from the stream. Return undefined if the
     * stream is empty.
     *
     * @return {*}
     */
    WebSocketStreams.prototype.read = function() {
      if (!this.paused_) {
        throw new AxiomError.Runtime('Cannot read: stream must be paused');
      }
      return this.read_();
    };

    /**
     * Write data into the stream (for implementers of the stream only).
     * Invoke the "onData" callback for all pending events if the callback is set.
     *
     * @param {!*} value
     * @param {EventCallback=} opt_callback
     * @return {void}
     */
    WebSocketStreams.prototype.write = function(value, opt_callback) {
      switch(this.webSocket.readyState) {
        case 0 /* CONNECTING */:
        case 1 /* OPEN */:
          var item = value;
          if (opt_callback) {
            item = new EventWithCallback(value, opt_callback);
          }
          this.writeQueue_.enqueue(item);
          this.flushWriteQueue_();
          break;

        case 2 /* CLOSING */:
        case 3 /* CLOSE */:
        default:
          throw new AxiomError.Runtime('Cannot write: the web socket is closed.');
      }
    };

    /**
     * @return {void}
     */
    WebSocketStreams.prototype.onSocketError_ = function() {
    };

    /**
     * @return {void}
     */
    WebSocketStreams.prototype.onSocketClose_ = function() {
      this.onClose.fire();
    };

    /**
     * @return {void}
     */
    WebSocketStreams.prototype.onSocketMessage_ = function(event) {
      var data = event.data;
      this.readQueue_.enqueue(data);
      if (this.paused_) {
        this.onReadable.fire();
      } else {
        this.flushReadQueue_();
      }
    };

    /**
     * @return {void}
     */
    WebSocketStreams.prototype.flushReadQueue_ = function() {
      while (!this.paused_) {
        var item = this.read_();
        if (!item)
          break;

        this.onData.fire(item);
      }
    };

    /**
     * @return {void}
     */
    WebSocketStreams.prototype.flushWriteQueue_ = function() {
      while(this.webSocket.readyState === 1 /* OPEN */) {
        var item = this.writeQueue_.dequeue();
        if (!item)
          break;

        if (item instanceof EventWithCallback) {
          this.webSocket.send(/** @type {string} */(item.value));
          // Note: Websocket API does not provide a notification when data is
          // actually sent to the peer, so we invoke the callback right away.
          item.callback();
        } else {
          this.webSocket.send(/** @type {string} */(item));
        }
      }
    };

    /**
     * Consume one event from the stream. Return undefined if the
     * stream is empty.
     *
     * @return {*}
     */
    WebSocketStreams.prototype.read_ = function() {
      return this.readQueue_.dequeue();
    };
  }
);

//# sourceMappingURL=web_socket_streams.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

/** @typedef function():void */
define("axiom/fs/stream/writable_stream", ["exports"], function(__exports__) {
 "use strict";

 function __es6_export__(name, value) {
  __exports__[name] = value;
 }

 var WriteCallback;

 var WritableStream = function() {};

 __es6_export__("WritableStream", WritableStream);

 /**
  * Write a value to the stream.
  *
  * @param {!*} value
  * @param {WriteCallback=} opt_callback  Callback invoked when the value has
  *     been consumed by the underlying transport.
  * @return {void}
  */
 WritableStream.prototype.write = function(value, opt_callback) {};
});

//# sourceMappingURL=writable_stream.js.map
// Copyright 2015 Google Inc. All rights reserved.
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

define(
 "axiom/fs/stream/writable_stream_source",
 ["axiom/fs/stream/axiom_stream", "exports"],
 function(axiom$fs$stream$axiom_stream$$, __exports__) {
  "use strict";

  function __es6_export__(name, value) {
   __exports__[name] = value;
  }

  var AxiomStream;
  AxiomStream = axiom$fs$stream$axiom_stream$$["default"];

  /** @typedef function():void */
  var EventCallback;

  /** @typedef StreamsSource$$module$axiom$fs$stream$streams_source */
  var StreamsSource;

  /** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
  var WritableStream;

  var WritableStreamSource = function(source) {
    AxiomStream.call(this);
    /** @const @private @type {StreamsSource} */
    this.source_ = source;
  };

  __es6_export__("WritableStreamSource", WritableStreamSource);
  __es6_export__("default", WritableStreamSource);

  WritableStreamSource.prototype = Object.create(AxiomStream.prototype);

  /**
   * Write an event to the stream.
   *
   * @override
   * @param {!*} value
   * @param {EventCallback=} opt_callback
   * @return {void}
   */
  WritableStreamSource.prototype.write = function(value, opt_callback) {
    return this.source_.write(value, opt_callback);
  };
 }
);

//# sourceMappingURL=writable_stream_source.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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
 *
 * Null values indicate that the given property is not known.  Unknown
 * properties are not propagated in the copyFrom/copyTo methods.
 */
define("axiom/fs/tty_state", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var TTYState = function() {
    /** @type {?boolean} */
    this.isatty = null;

    /** @type {?number} */
    this.rows = null;

    /** @type {?number} */
    this.columns = null;

    /** @type {?string} */
    this.interrupt_ = null;
  };

  __es6_export__("TTYState", TTYState);
  __es6_export__("default", TTYState);

  /**
   * ^C
   */
  TTYState.defaultInterrupt = String.fromCharCode('C'.charCodeAt(0) - 64);

  /**
   * Copy values from another TTYState instance or an arbitrary object.
   *
   * @param {Object} obj
   * @return {void}
   */
  TTYState.prototype.copyFrom = function(obj) {
    if ('isatty' in obj && obj.isatty != null)
      this.isatty = !!obj.isatty;

    if ('rows' in obj && obj.rows != null)
      this.rows = obj.rows;

    if ('columns' in obj && obj.columns != null)
      this.columns = obj.columns;

    if (!this.rows || !this.columns) {
      this.rows = 0;
      this.columns = 0;
      this.isatty = false;
    } else {
      this.isatty = true;
    }

    if (this.rows < 0 || this.columns < 0)
      throw new Error('Invalid tty size.');

    if ('interrupt_' in obj && obj.interrupt_ != null)
      this.interrupt_ = obj.interrupt_;
  };

  /**
   * @param {string} str
   * @return {void}
   */
  TTYState.prototype.setInterrupt = function(str) {
    this.interrupt_ = str;
  };

  /**
   * @return {string}
   */
  TTYState.prototype.getInterrupt = function() {
    if (this.interrupt_ == null)
      return TTYState.defaultInterrupt;

    return this.interrupt_;
  };

  /**
   * @param {Object} obj
   * @return {void}
   */
  TTYState.prototype.copyTo = function(obj) {
    if (this.isatty != null)
      obj.isatty = this.isatty;
    if (this.rows != null)
      obj.rows = this.rows;
    if (this.columns != null)
      obj.columns = this.columns;
    if (this.interrupt != null)
      obj.interrupt = this.interrupt;
  };

  /**
   * @return {TTYState}
   */
  TTYState.prototype.clone = function() {
    var rv = new TTYState();
    rv.copyFrom(this);
    return rv;
  };
});

//# sourceMappingURL=tty_state.js.map
// Copyright (c) 2015 Google Inc. All rights reserved.
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

/** @typedef {SeekWhence$$module$axiom$fs$seek_whence} */
define("axiom/fs/write_result", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var SeekWhence;

  /** @typedef {DataType$$module$axiom$fs$data_type} */
  var DataType;

  var WriteResult = function(offset, whence, dataType) {
    /** @type {number} */
    this.offset = offset;

    /** @type {SeekWhence} */
    this.whence = whence;

    /** @type {DataType} */
    this.dataType = dataType;

    /** @type {*} */
    this.data = null;
  };

  __es6_export__("WriteResult", WriteResult);
  __es6_export__("default", WriteResult);
});

//# sourceMappingURL=write_result.js.map
// GENERATED BY grunt make_version_module.
define("axiom/version", ["exports"], function(__exports__) {
  "use strict";

  function __es6_export__(name, value) {
    __exports__[name] = value;
  }

  var version = "1.0.4";
  __es6_export__("version", version);
  __es6_export__("default", version);
});

//# sourceMappingURL=version.js.map