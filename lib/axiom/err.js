// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * An error value used when rejecting a promise.
 */
export var Err = function(name, value) {
  this.name = name;
  this.value = value;
};

Err.prototype = Object.create(Error);

// Define a function which will construct a new error with the given name.
// The constructor will also have a static 'test(err)' method which
// returns true if the given Err instance has the same name.
var mkerr = function(name, argNames) {
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

    return new Err(name, value);
  };

  ctor.test = function(err) {
    return (err instanceof Err && err.name ===  name);
  };

  Err[name] = ctor;
};

mkerr('Duplicate', ['type', 'value']);
mkerr('Invalid', ['type', 'value']);
mkerr('Missing', ['type']);
mkerr('NotFound', ['type', 'value']);
mkerr('Incompatible', ['type', 'value']);
