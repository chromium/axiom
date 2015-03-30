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

import Arguments from 'axiom/fs/arguments';

/**
 * @constructor
 *
 * Collection of parse methods that can be used to pick apart a string.
 *
 * Most methods consume some number of characters from the current position
 * in the source string.  Those methods that start with "parse" also return
 * a representation of the part of the source they consumed.
 *
 * @param {string} source
 * @param {number=} opt_pos
 */
export var Parse = function(source, opt_pos) {
  /**
   * @type {string} The source string.
   */
  this.source = source;

  /**
   * @type {number} The current position.
   */
  this.pos = opt_pos || 0;

  /**
   * @type {string} The character at the current position.
   */
  this.ch = this.source.substr(this.pos, 1);
};

export default Parse;

/**
 * @param {string} message
 * @return {AxiomError}
 */
Parse.prototype.error = function(message) {
  return new AxiomError.Parse(message, this.pos);
};

/**
 * Advance the current position.
 *
 * @param {number} count
 */
Parse.prototype.advance = function(count) {
  this.pos += count;
  this.ch = this.source.substr(this.pos, 1);
};

/**
 * Parse from the current position, expecting to find command-line arguments
 * as described by `signature`.
 *
 * Returns a new Arguments object.
 *
 * @param {Object} signature
 * @param {Object=} opt_defaults
 * @return {Arguments}
 */
Parse.prototype.parseArgs = function(signature, opt_defaults) {
  var args = new Arguments(signature, opt_defaults || {});

  var loose = [];

  var nextArg = function() {
    if (this.ch == '-') {
      this.advance(1);
      var name;

      if (this.ch == '-') {
        // double-dash parameter
        this.advance(1);
        name = this.parsePattern(/[a-z0-9\-\_]+/ig);
      } else {
        name = this.ch;
        this.advance(1);
      }

      var record;
      if (/^no-/.test(name)) {
        name = name.substr(3);
        record = args.getRecord(name);
        if (!record)
          throw this.error('Unknown argument: ' + name);

        if (record.sigil != '?')
          throw this.error('Not a boolean argument: ' + name);

        record.setValue(false);
        return;
      }

      record = args.getRecord(name);
      if (!record)
        throw this.error('Unknown argument: ' + name);

      if (record.sigil == '?') {
        record.setValue(true);
        return;
      }

      this.skipSpace();
      if (this.ch == '=') {
        this.advance(1);
        this.skipSpace();
      }

      if (record.sigil == '$') {
        record.setValue(this.parseSloppyString());
        return;
      }

      if (record.sigil == '%') {
        record.setValue(this.parseObject());
        return;
      }

      if (record.sigil == '@') {
        record.setValue(this.parseArray());
        return;
      }

      if (record.sigil == '*') {
        record.setValue(this.parseValue());
        return;
      }

      throw this.error('Unknown arg sigil: ' + record.sigil);
    } else {
      loose.push(this.parseValue());
    }
  };

  this.skipSpace();

  while (this.pos < this.source.length) {
    var lastPos = this.pos;

    nextArg.call(this);

    if (this.pos == lastPos)
      throw this.error('internal error: Parser did not advance position');

    this.skipSpace();
  }

  if (loose.length) {
    var record = args.getRecord('_');
    var value;

    if (record) {
      if (record.sigil !== '@')
        throw this.error('Can\'t parse loose sigil: ' + record.sigil);

      args.setValue('_', loose);
    }
  }

  return args;
};

/**
 * Parse from the current position, without expectations about what we'll find.
 *
 * If it looks like we're starting with an object ('{') or array ('[') literal,
 * then we'll defer to the appropriate parse method.  If not, we'll assume it's
 * a string which may or may not be quoted.
 *
 * @param {RegExp=} opt_sloppyPattern Optional patter to be used for sloppy
 *   string parsing.
 * @return {*}
 */
Parse.prototype.parseValue = function(opt_sloppyPattern) {
  if (this.ch == '[')
    return this.parseArray();

  if (this.ch == '{')
    return this.parseObject();

  return this.parseSloppyString(opt_sloppyPattern);
};

/**
 * Parse from the current position, expecting to find an array literal.
 *
 * The array literal can be specified in relaxed version of JSON, which
 * allows for quotes to be left out of values.
 *
 * The array literal may contain objects or arrays nested arbitrarily deep.
 *
 * @return {Array}
 */
Parse.prototype.parseArray = function() {
  if (this.ch != '[')
    throw this.error('Expected "["');

  this.advance(1);

  var rv = [];
  if (this.ch == ']') {
    this.advance(1);
    return rv;
  }

  while (this.pos < this.source.length) {
    this.skipSpace();

    rv.push(this.parseValue());

    this.skipSpace();

    if (this.ch == ',') {
      this.advance(1);
      continue;
    }

    if (this.ch == ']') {
      this.advance(1);
      return rv;
    }

    throw this.error('Expected "," or "]"');
  }

  throw this.error('Unterminated array');
};

/**
 * Parse from the current position, expecting to find an object literal.
 *
 * The object literal can be specified in relaxed version of JSON, which
 * allows for quotes to be left out of keys and values.
 *
 * The object literal may contain objects or arrays nested arbitrarily deep.
 *
 * @return {Object}
 */
Parse.prototype.parseObject = function() {
  if (this.ch != '{')
    throw this.error('Expected {');

  this.advance(1);
  this.skipSpace();

  var rv = {};
  if (this.ch == '}') {
    this.advance(1);
    return rv;
  }

  while (this.pos < this.source.length) {
    this.skipSpace();

    // We explicitly add colon to the list of chars to disallow in a sloppy
    // key name, so we don't eat the name: value delimiter.
    var name = this.parseSloppyString(/[^\s,{}\[\]:]+/g);
    this.skipSpace();
    if (this.ch != ':')
      throw this.error('Expected :');

    this.advance(1);
    this.skipSpace();

    var value = this.parseValue();
    rv[name] = value;
    this.skipSpace();

    if (this.ch == ',') {
      this.advance(1);
      continue;
    }

    if (this.ch == '}') {
      this.advance(1);
      return rv;
    }

    throw this.error('Expected "," or "}"');
  }

  throw this.error('Unterminated object literal');
};

/**
 * Parse an escape code from the current position (which should point to
 * the first character AFTER the leading backslash.)
 *
 * @return {string}
 */
Parse.prototype.parseEscape = function() {
  var map = {
    '"': '"',
    '\'': '\'',
    '\\': '\\',
    'a': '\x07',
    'b': '\x08',
    'e': '\x1b',
    'f': '\x0c',
    'n': '\x0a',
    'r': '\x0d',
    't': '\x09',
    'v': '\x0b',
    'x': function() {
      var value = this.parsePattern(/[a-z0-9]{2}/ig);
      return String.fromCharCode(parseInt(value, 16));
    },
    'u': function() {
      var value = this.parsePattern(/[a-z0-9]{4}/ig);
      return String.fromCharCode(parseInt(value, 16));
    }
  };

  if (!(this.ch in map))
    throw this.error('Unknown escape: ' + this.ch);

  var value = map[this.ch];
  this.advance(1);

  if (typeof value == 'function')
    value = value.call(this);

  return value;
};

/**
 * Parse a string that may or may not be quoted.
 *
 * @param {RegExp=} opt_pattern Optional pattern specifying what constitutes
 *   a valid run of characters.
 * @return {string}
 */
Parse.prototype.parseSloppyString = function(opt_pattern) {
  if (this.ch == '"' || this.ch == '\'')
    return this.parseString();

  return this.parsePattern(opt_pattern || /[^\s,{}\[\]]+/g);
};

/**
 * Parse a single or double quoted string.
 *
 * The current position should point at the initial quote character.  Single
 * quoted strings will be treated literally, double quoted will process escapes.
 *
 * TODO(rginda): Variable interpolation.
 *
 * @param {ParseState} parseState
 * @param {string} quote A single or double-quote character.
 * @return {string}
 */
Parse.prototype.parseString = function() {
  var result = '';

  var quote = this.ch;
  if (quote != '"' && quote != '\'')
    throw this.error('String expected');

  this.advance(1);

  var re = new RegExp('[\\\\' + quote + ']', 'g');

  while (this.pos < this.source.length) {
    re.lastIndex = this.pos;
    if (!re.exec(this.source))
      throw this.error('Unterminated string literal');

    result += this.source.substring(this.pos, re.lastIndex - 1);

    this.advance(re.lastIndex - this.pos - 1);

    if (quote == '"' && this.ch == '\\') {
      this.advance(1);
      result += this.parseEscape();
      continue;
    }

    if (quote == '\'' && this.ch == '\\') {
      result += this.ch;
      this.advance(1);
      continue;
    }

    if (this.ch == quote) {
      this.advance(1);
      return result;
    }
  }

  throw this.error('Unterminated string literal');
};

/**
 * Parse the given pattern starting from the current position.
 *
 * @param {RegExp} pattern A pattern representing the characters to span.  MUST
 *   include the "global" RegExp flag.
 * @return {string}
 */
Parse.prototype.parsePattern = function(pattern) {
  if (!pattern.global)
    throw this.error('Internal error: Span patterns must be global');

  pattern.lastIndex = this.pos;
  var ary = pattern.exec(this.source);

  if (!ary || pattern.lastIndex - ary[0].length != this.pos)
    throw this.error('Expected match for: ' + pattern);

  this.pos = pattern.lastIndex - 1;
  this.advance(1);

  var res = ary[0];
  if (!isNaN(+res))
    res = +res;
  else if (res === 'true')
    res = true;
  else if (res === 'false')
    res = false;

  return res;
};

/**
 * @param {string=} opt_expect A list of valid non-whitespace characters to
 *   terminate on.
 * @return {void}
 */
Parse.prototype.skipSpace = function(opt_expect) {
  if (!/\s/.test(this.ch))
    return;

  var re = /\s+/gm;
  re.lastIndex = this.pos;

  var source = this.source;
  if (re.exec(source))
    this.pos = re.lastIndex;

  this.ch = this.source.substr(this.pos, 1);

  if (opt_expect) {
    if (this.ch.indexOf(opt_expect) == -1) {
      throw this.error('Expected one of ' + opt_expect + ', found: ' +
          this.ch);
    }
  }
};
