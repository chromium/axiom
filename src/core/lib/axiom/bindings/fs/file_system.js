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
import BaseBinding from 'axiom/bindings/base';

/** @typedef ExecuteContext$$module$axiom$bindings$fs$execute_context */
var ExecuteContext;

/** @typedef OpenContext$$module$axiom$bindings$fs$open_context */
var OpenContext;

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/**
 * @constructor @extends {BaseBinding}
 */
var FileSystem = function() {
  BaseBinding.call(this, {
    alias: {type: 'method'},
    createExecuteContext: {type: 'method'},
    createOpenContext: {type: 'method'},
    list: {type: 'method'},
    mkdir: {type: 'method'},
    move: {type: 'method'},
    stat: {type: 'method'},
    unlink: {type: 'method'},
  });
};

export {FileSystem};
export default FileSystem;

FileSystem.prototype = Object.create(BaseBinding.prototype);

/**
 * Create an alias entry.
 *
 * Bindable method.
 *
 * @param {string} pathSpecFrom
 * @param {string} pathSpecTo
 */
FileSystem.prototype.alias = function(pathSpecFrom, pathSpecTo) {};

/**
 * Create an execute context.
 *
 * Bindable method.
 *
 * @param {string} pathSpec
 * @param {Object} arg
 * @return {!Promise<!ExecuteContext>}
 */
FileSystem.prototype.createExecuteContext = function(pathSpec, arg) {};

/**
 * Create an open context.
 *
 * Bindable method.
 *
 * @param {string} pathSpec
 * @param {Object} arg
 * @return {!Promise<!OpenContext>}
 */
FileSystem.prototype.createOpenContext = function(pathSpec, arg) {};

/**
 * Return an array of stat metadata for each entry in a directory.
 *
 * Bindable method.
 *
 * @param {string} pathSpec
 * @return {Promise<Object<string, StatResult>>}
 */
FileSystem.prototype.list = function(pathSpec) {};

/**
 * Make a new directory.
 *
 * Bindable method.
 *
 * @param {string} pathSpec
 * @return {Promise<undefined>}
 */
FileSystem.prototype.mkdir = function(pathSpec) {};

/**
 * Move an entry from one location to another.
 *
 * Bindable method.
 *
 * @param {string} pathSpecFrom
 * @param {string} pathSpecTo
 * @return {Promise<undefined>}
 */
FileSystem.prototype.move = function (pathSpecFrom, pathSpecTo) {};

/**
 * Get metadata for a path.
 *
 * Bindable method.
 *
 * @param {string} pathSpec
 * @return {!Promise<!StatResult>}
 */
FileSystem.prototype.stat = function(pathSpec) {};

/**
 * Remove a path.
 *
 * Bindable method.
 *
 * @param {string} pathSpec
 * @return {Promise<undefined>}
 */
FileSystem.prototype.unlink = function(pathSpec) {};

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

  return this.createOpenContext(path, openArg).then(
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

  openArg.write = true;

  writeArg = writeArg || {};

  return this.createOpenContext(path, openArg).then(
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
