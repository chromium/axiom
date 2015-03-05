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

import AxiomError from 'axiom/core/error';

/**
 * @constructor
 * @param {Object<string, string>} signature
 * @param {Object} arg
 */
export var Arguments = function(signature, arg) {
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

export default Arguments;

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

  if (sigil == '!' && typeof value == 'boolean')
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
    if (this.records[key].indexOf(name) != -1)
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
