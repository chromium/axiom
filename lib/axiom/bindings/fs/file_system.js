// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import BaseBinding from 'axiom/bindings/base';

export var FileSystem = function() {
  BaseBinding.call(this, {
    // Create an alias entry.
    alias: {type: 'method', args: ['pathSpecFrom', 'pathSpecTo']},

    // Create an open or execute context.
    createContext: {type: 'method', args: ['contextType', 'pathSpec', 'arg']},

    // Return an array of stat metadata for each entry in a directory.
    list: {type: 'method', args: ['pathSpec']},

    // Make a new directory.
    mkdir: {type: 'method', args: ['pathSpec']},

    // Move an entry from one location to another.
    move: {type: 'method', args: ['pathSpecFrom', 'pathSpecTo']},

    // Get metadata for a path.
    stat: {type: 'method', args: ['pathSpec']},

    // Remove a path.
    unlink: {type: 'method', args: ['pathSpec']},
  });
};

export default FileSystem;

FileSystem.prototype = Object.create(BaseBinding.prototype);

/**
 * Read the entire contents of a file.
 *
 * This is a utility method that creates an OpenContext, uses the read
 * method to read in the entire file (by default) and then discards the
 * open context.
 *
 * By default this will return the data in the dataType preferred by the
 * file.  You can request a specific dataType by including it in readArg.
 *
 * @param {string} path The path to read.
 * @param {Object} openArg Additional arguments to pass to the
 *   OpenContext..open() call.
 * @param {Object} readArg Additional arguments to pass to the
 *   OpenContext..read() call.
 *
 */
FileSystem.prototype.readFile = function(path, openArg, readArg) {
  /**
   * Create an open context associated with this file system.
   */
  var createOpenContext = function(path, arg) {
    var openContext = new this.createContext('open', path, arg);
    openContext.dependsOn(this);
    return openContext;
  }.bind(this);

  var ocx;
  return new Promise(function(resolve, reject) {
    var ocx = createOpenContext(path, openArg);

    ocx.onClose.addListener(function(value) {
        if (!ocx.readyValue)
        reject(ocx.closeValue);
    });

    ocx.onReady.addListener(function() {
      ocx.read(
          readArg,
          function(result) {
            ocx.closeOk(null);
            resolve(result);
          },
          function(value) {
            ocx.closeOk(null);
            reject(value);
          });
    });

    ocx.open(path, openArg);
  });
};

