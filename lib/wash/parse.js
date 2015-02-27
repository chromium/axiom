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
parse.ParseState = function(source, opt_pos) {
  /** @type {string} */
  this.source = source;
  /** @type {number} */
  this.pos = opt_pos || 0;
  /** @type {AxiomError?} */
  this.lastError = null;
  /** @type {string?} */
  this.lastToken = null;
};

/**
 * @param {number} count
 */
parse.ParseState.prototype.advance = function(count) {
  this.pos += count;
  this.lastError = null;
  this.lastToken = this.source.substr(this.pos, 1);
};

/**
 * @param {number} count
 */
parse.ParseState.prototype.rewind = function(count) {
  this.pos -= count;
  this.lastError = null;
  this.lastToken = this.source.substr(this.pos, 1);
};

/**
 * Parse a relaxed json object.
 *
 *   { foo: 1 }, { "foo": 1 }, { 'foo': 1 }
 *
 * @param {parse.ParseState} parseState
 * @return {Object}
 */
parse.parseObject = function(parseState) {
  if (!skipSpace(parseState, '{'))
    return;

  parseState.advance(1);

  while (parseState.pos < parseState.source.length) {
    skipSpace(parseState, null);
    if (parseState.lastToken == '"') {
    }
  }
};

/**
 * @param {parse.ParseState} parseState
 * @return {string}
 */
parse.parseEscape = function(parseState) {

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
 * @return {boolean}
 */
var spanString = function(parseState, quote) {
  var re = new RegExp('[\\' + quote + ']', 'g');
  re.lastIndex = parseState.pos;

  var startPos = parseState.pos;
  var esc = false;

  while (parseState.pos < parseState.source.length) {
    if (!re.exec(parseState.source)) {
      parseState.lastError = new AxiomError.Parse(
          'Unterminated string literal', parseState.pos);
      return false;
    }

    parseState.pos = re.lastIndex;

    var ch = parseState.source.substr(re.lastIndex, 1);
    if (esc && ch == '\\') {
      esc = true;
      parseState.advance(1);
      continue;
    }

    esc = false;

    if (ch == quote) {
      parseState.lastToken = parseState.source.substring(startPos,
                                                         parseState.pos);
      parseState.advance(1);
    }
  }
};

/**
 * Consume a particular pattern from the current parse position.
 *
 * @param {ParseState} parseState
 * @param {string} pattern
 * @param {string=} opt_flags
 * @return {boolean}
 */
var spanPattern = function(parseState, pattern, opt_flags) {
  var re = new RegExp(pattern, (opt_flags || '') + 'g');
  re.lastIndex = parseState.pos;
  re.exec(parseState.source);
  parseState.lastToken = parseState.source.substring(parseState.pos,
                                                     re.lastIndex);
  if (parseState.pos == re.lastIndex)
    return false;

  parseState.pos = re.lastIndex;
  return true;
};

/**
 * Skip whitespace.
 *
 * Sets a parse error if the character after the whitespace is not listed in
 * `expect`.  Pass an empty string as `expect` to skip the error checking.
 *
 * Sets parseState.lastToken the the first non-whitespace character.
 *
 * @param {ParseState} parseState
 * @param {string?} expect
 * @return {boolean}
 */
var skipSpace = function(parseState, expect) {
  var re = /^\s+/gm;
  re.lastIndex = parseState.startPos;

  var source = parseState.source;
  re.exec(source);

  parseState.pos = re.lastIndex;
  parseState.lastToken = source.substr(parseState.pos, 1);

  if (expect) {
    if (parseState.lastToken.indexOf(expect) == -1) {
      parseState.lastError = new AxiomError.Parse(
        'Expected one of ' + expect + ', found: ' +
        parseState.lastToken, parseState.pos);
    }
  } else {
    parseState.lastError = null;
  }

  return parseState.lastError != null;
};
