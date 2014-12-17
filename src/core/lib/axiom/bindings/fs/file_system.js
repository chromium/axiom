// Copyright (c) 2014 The Axiom Authors. All rights reserved.
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
 * file. You can request a specific dataType by including it in readArg.
 *
 * @param {string} path The path to read.
 * @param {Object} openArg Additional arguments to pass to the
 *   OpenContext..open() call.
 * @param {Object} readArg Additional arguments to pass to the
 *   OpenContext..read() call.
 */
FileSystem.prototype.readFile = function(path, openArg, readArg) {
  if (!openArg)
    openArg = {};
  openArg.read = true;

  readArg = readArg || {};

  return this.createContext('open', path, openArg).then(
    function(ocx) {
      return ocx.open().then(
        function() {
          return ocx.read(readArg).then(function(result) {
            ocx.closeOk(null);
            return Promise.resolve(result);
          }).catch(function(e) {
            ocx.closeErrorValue(e);
            return Promise.reject(e);
          });
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
 * @param {string} path The path to read.
 * @param {Object} openArg Additional arguments to pass to the
 *   OpenContext..open() call.
 * @param {Object} writeArg Additional arguments to pass to the
 *   OpenContext..write() call.
 */
FileSystem.prototype.writeFile = function(path, openArg, writeArg) {
  if (!openArg)
    openArg = {};

  openArg.create = 'true';

  writeArg = writeArg || {};

  return this.createContext('open', path, openArg).then(
    function(ocx) {
    return ocx.open().then(
      function() {
      return ocx.write(writeArg).then(function(result) {
        ocx.closeOk(null);
	return Promise.resolve(result);
      }).catch(function(e) {
        ocx.closeErrorValue(e);
	return Promise.reject(e);
      });
    });
  });
};
