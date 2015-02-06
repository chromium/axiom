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

import AxiomError from 'axiom/core/error';
import Ephemeral from 'axiom/core/ephemeral';

import OpenContext from 'axiom/fs/base/open_context';

/** @typedef {StatResult$$module$axiom$fs$stat_result} */
var StatResult;

/** @typedef {ExecuteContext$$module$axiom$fs$base$execute_context} */
var ExecuteContext;

var abstract = function() { throw new AxiomError.AbstractCall() };

/**
 * @constructor @extends {Ephemeral}
 */
export var FileSystem = function() {
  Ephemeral.call(this);
};

export default FileSystem;

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
 * @param {string} pathSpecFrom
 * @param {string} pathSpecTo
 * @return {!Promise<undefined>}
 */
FileSystem.prototype.alias = function(pathSpecFrom, pathSpecTo) {
  abstract();
};

/**
 * @param {string} pathSpec
 * @param {*} arg
 * @return {!Promise<!ExecuteContext>}
 */
FileSystem.prototype.createExecuteContext = function(pathSpec, arg) {
  abstract();
};

/**
 * @param {string} pathSpec
 * @param {string|OpenContext.Mode} mode
 * @return {!Promise<!OpenContext>}
 */
FileSystem.prototype.createOpenContext = function(pathSpec, mode) {
  abstract();
};

/**
 * @param {string} pathSpec
 * @return {!Promise<!Object<string, StatResult>>}
 */
FileSystem.prototype.list = function(pathSpec) {
  abstract();
};

/**
 * @param {string} pathSpec
 * @return {!Promise<undefined>}
 */
FileSystem.prototype.mkdir = function(pathSpec) {
  abstract();
};

/**
 * Move an entry from a path on a file system to a different path on the
 * same file system.
 *
 * The destination path must refer to a file that does not yet exist, inside a
 * directory that does.
 *
 * @param {string} fromPathSpec
 * @param {string} toPathSpec
 * @return {!Promise<undefined>}
 */
FileSystem.prototype.move = function(fromPathSpec, toPathSpec) {
  abstract();
};

/**
 * @param {string} pathSpec
 * @return {!Promise<!StatResult>}
 */
FileSystem.prototype.stat = function(pathSpec) {
  abstract();
};

/**
 * Remove the given path.
 *
 * @param {string} pathSpec
 * @return {Promise}
 */
FileSystem.prototype.unlink = function(pathSpec) {
  abstract();
};
