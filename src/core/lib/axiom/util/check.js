// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function verify(cond, message, text) {
  if (!message)
    message = 'Assertion failed';
  if (!text)
    text = '';

  if (!cond) {
    throw new Error(message, message + ': ' + text);
  }
}

/**
 * Runtime checks.
 */
export var Check = {
  'true': function(cond, message, text) {
    verify(cond, message, text);
  },

  'fail': function(message) {
    verify(false, message);
  },

  'eq': function(value, expectedValue, message) {
    if (value === expectedValue)
      return;

    verify(false, 'Value ' + value + ' is not the expected value ' + expectedValue, message);
  },

  'ne': function(value, expectedValue, message) {
    if (value !== expectedValue)
      return;

    verify(false, 'Value ' + value + ' should not be equal to ' + expectedValue, message);
  },

  'ge': function(value, expectedValue, message) {
    if (value >= expectedValue)
      return;

    verify(false, 'Value ' + value + ' is expected to be >= ' + expectedValue, message);
  },

  'le': function(value, expectedValue, message) {
    if (value <= expectedValue)
      return;

    verify(false, 'Value ' + value + ' is expected to be <= ' + expectedValue, message);
  },

  'in': function(value, expectedValues, message) {
    for (var i = 0; i < expectedValues.length; i++) {
      if (value === expectedValues[i])
        return;
    }
    var expectedValuesPrint = '[';
    for (i = 0; i < expectedValues.length; i++) {
      if (i > 0)
        expectedValuesPrint += ',';

      expectedValuesPrint += expectedValues[i];
    }
    expectedValuesPrint += ']';
    verify(false, 'Value ' + value + ' is one of ' + expectedValuesPrint, message);
  }
};

export default Check;
