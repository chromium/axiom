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

export var parse = {};
export default parse;

/**
 * @constructor
 * @param {string} source
 * @param {number=} opt_pos
 */
var Parse = function(source, opt_pos) {
  /** @type {string} */
  this.source = source;

  /** @type {number} */
  this.pos = opt_pos || 0;
};

/**
 * @param {string} message
 * @return {AxiomError}
 */
Parse.prototype.error = function(message) {
  return new AxiomError.Parse(message, this.pos);
};

/**
 * Advance the current position
 * @param {number} count
 */
Parse.prototype.advance = function(count) {
  this.pos += count;
  this.lastToken = this.source.substr(this.pos, 1);
};

/**
 * @param {number} count
 */
Parse.prototype.rewind = function(count) {
  this.pos -= count;
  this.lastToken = this.source.substr(this.pos, 1);
};

/**
 * Parse a relaxed json object.
 *
 *   { foo: 1 }, { "foo": 1 }, { 'foo': 1 }
 *
 * @return {Object}
 */
Parse.prototype.parseObject = function() {
  this.skipSpace('{');
  this.advance(1);

  while (this.pos < this.source.length) {
    var ch = skipSpace(null);
    if (ch == '"' || ch == '\'') {
      var name = this.parseString();
      console.log(name);
    }

    throw this.error('todo');
  }
};

/**
 * @param {parse.ParseState} parseState
 * @return {string}
 */
Parse.prototype.parseEscape = function() {
  throw this.error('todo');
};

/**
 * Consume until the end of a string, handling escapes along the way.
 *
 * When finished, parseState.lastToken will be the contents of the string,
 * minus the trailing quote, and parseState.pos will be after the trailing
 * quote.
 *
 * Escape sequences will be intact.
 *
 * @param {ParseState} parseState
 * @param {string} quote A single or double-quote character.
 * @return {string?}
 */
Parse.prototype.parseString = function() {
  var result = '';

  var quote = this.source.substr(this.pos, 1);
  if (quote != '"' && quote != '\'')
    throw this.error('String expected');

  var re = new RegExp('[\\' + quote + ']', 'g');
  re.lastIndex = this.pos;

  while (this.pos < this.source.length) {
    if (!re.exec(this.source))
      throw this.error('Unterminated string literal');

    result += this.source.substring(this.pos, re.lastIndex);
    this.pos = re.lastIndex;

    var ch = this.source.substr(re.lastIndex, 1);
    if (quote == '"' && ch == '\\') {
      this.advance(1);
      var esc = this.parseEscape();
      result += esc;
      continue;
    }

    if (ch == quote) {
      this.advance(1);
      return result;
    }
  }

  throw this.error('Unterminated string literal');
};

/**
 * Consume a particular pattern from the current parse position.
 *
 * @param {string} pattern
 * @param {string=} opt_flags
 * @return {boolean}
 */
Parse.prototype.spanPattern = function(pattern, opt_flags) {
  var re = new RegExp(pattern, (opt_flags || '') + 'g');
  re.lastIndex = this.pos;
  re.exec(this.source);

  if (this.pos == re.lastIndex)
    throw this.error('Expected match for: ' + pattern);

  var ch = this.source.substring(this.pos, re.lastIndex);

  this.pos = re.lastIndex;
  return true;
};

/**
 * Skip whitespace, return the next non-whitespace character.
 *
 * @return {string}
 */
Parse.prototype.skipSpace = function(expect) {
  var re = /^\s+/gm;
  re.lastIndex = this.startPos;

  var source = this.source;
  re.exec(source);

  this.pos = re.lastIndex;

  if (expect) {
    if (this.lastToken.indexOf(expect) == -1) {
      throw this.error('Expected one of ' + expect + ', found: ' +
          this.lastToken);
    }
  }
};
