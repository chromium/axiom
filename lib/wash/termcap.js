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

/**
 * @constructor
 *
 * Class used to convert lib.replaceVars-like strings into actual terminal
 * escape.
 *
 * This is roughly analogous to Linux's termcap library.
 *
 * Instances of this class are able to translate both outgoing strings and
 * incoming key sequences.
 */
var Termcap = function() {};
export {Termcap};
export default Termcap;

/**
 * Replace %<function>(VAR,...) and %(VAR) patterns in the given string, using
 * the set of output functions and variables.
 *
 * Use this for string you intend to write to the terminal.  For example,
 * the default prompt for wash: '%set-attr(FG_BOLD, FG_CYAN)wash$ %set-attr()'.
 *
 * See the outputVars and outputFunctions below for the list of valid stuff.
 * @param {string} str
 * @param {Object=} opt_vars
 */
Termcap.prototype.output = function(str, opt_vars) {
  var vars;
  if (opt_vars) {
    vars = Object.create(this.outputVars);
    for (var key in opt_vars) {
      vars[key] = opt_vars[key];
    }
  } else {
    vars = this.outputVars;
  }

  return Termcap.replaceVars_(str, vars, this.outputFunctions);
};

/**
 * Replace %<function>(VAR,...) and %(VAR) patterns in the given string, using
 * the set of output functions and variables.
 *
 * Use this to convert mnemonic keystrokes into their byte sequences.  For
 * example, some default keybindings from lib_wa_readline.js:
 *
 *  '%ctrl("_")': 'undo',
 *  '%ctrl("/")': 'undo',
 *
 *  '%ctrl(LEFT)': 'backward-word',
 *  '%ctrl(RIGHT)': 'forward-word',
 *
 *  '%meta(BACKSPACE)': 'backward-kill-word',
 *  '%meta(DELETE)': 'kill-word',
 *
 * See the inputVars and inputFunctions below for the list of valid stuff.
 * 
 * @param {string} str
 * @param {Object=} opt_vars
 */
Termcap.prototype.input = function(str, opt_vars) {
  var vars;
  if (opt_vars) {
    vars = Object.create(this.inputVars);
    for (var key in opt_vars) {
      vars[key] = opt_vars[key];
    }
  } else {
    vars = this.inputVars;
  }

  return Termcap.replaceVars_(str, vars, this.inputFunctions);
};

/**
 * The valid variables for Termcap..output()
 */
Termcap.prototype.outputVars = {
  'FG_BOLD': '1',

  'FG_BLACK': '30',
  'FG_RED': '31',
  'FG_GREEN': '32',
  'FG_YELLOW': '33',
  'FG_BLUE': '34',
  'FG_MAGENTA': '35',
  'FG_CYAN': '36',
  'FG_WHITE': '37',
  'FG_DEFAULT': '39',

  'BG_BLACK': '40',
  'BG_RED': '41',
  'BG_GREEN': '42',
  'BG_YELLOW': '43',
  'BG_BLUE': '44',
  'BG_MAGENTA': '45',
  'BG_CYAN': '46',
  'BG_WHITE': '47',
  'BG_DEFAULT': '49',
};

/**
 * The valid functions for Termcap..output()
 */
Termcap.prototype.outputFunctions = {
  'clear-terminal': function() {
    return '\x1b[2J';
  },

  'crlf': function(str) {
    return str.replace(/\n/g, '\r\n');
  },

  'set-attr': function(/* ... */) {
    var args = ['0'];
    args.push.apply(args, arguments);
    return '\x1b[' + args.join(';') + 'm';
  },

  'add-attr': function(/* ... */) {
    var args = [];
    args.push.apply(args, arguments);
    return '\x1b[' + args.join(';') + 'm';
  },

  'insert-blank': function(opt_count) {
    return ('\x1b[' + (opt_count || '') + '@');
  },

  'erase-chars': function(opt_count) {
    return ('\x1b[' + (opt_count || '') + 'X');
  },

  'erase-right': function() {
    return ('\x1b[K');
  },

  'set-row-column': function(row, column) {
    if (isNaN(row) || isNaN(column))
      throw new Error('Invalid row/column: ' + row + ', ' + column);
    return '\x1b[' + row + ';' + column + 'H';
  },

  'cursor-left': function(opt_count) {
    return ('\x1b[' + (opt_count || '') + 'D');
  },

  'cursor-right': function(opt_count) {
    return ('\x1b[' + (opt_count || '') + 'C');
  },

  'bell': function() {
    return ('\x07');
  },

  'insert-lines': function(opt_count) {
    return ('\x1b[' + (opt_count || '') + 'L');
  },

  'get-row-column': function() {
    return ('\x1b[6n');
  }
};

/**
 * The valid variables for Termcap..input()
 */
Termcap.prototype.inputVars = {
  'BACKSPACE': '\x7f',
  'DELETE': '\x1b[3~',
  'DOWN': '\x1b[B',
  'END': '\x1b[F',
  'ENTER': '\r',
  'HOME': '\x1b[H',
  'INSERT': '\x1b[2~',
  'LEFT': '\x1b[D',
  'META': '\x1b',
  'PGDN': '\x1b[6~',
  'PGUP': '\x1b[5~',
  'RIGHT': '\x1b[C',
  'UP': '\x1b[A',
};


/**
 * The valid functions for Termcap..input()
 */
Termcap.prototype.inputFunctions = {
  'shift': function(seq) {
    if (/\x1b\[/.test(seq))
      return Termcap.modcsi(';2', seq);

    if (seq.length == 1)
      return seq.toUpperCase();

    throw new Error('Invalid ctrl sequence: ' + seq);
  },

  'meta': function(seq) {
    if (/\x1b\[/.test(seq))
      return Termcap.modcsi(';3', seq);

    return '\x1b' + seq;
  },

  'shift-meta': function(seq) {
    if (/\x1b\[/.test(seq))
      return Termcap.modcsi(';4', seq);

    return '\x1b' + seq.toUpperCase();
  },

  'ctrl': function(seq) {
    if (/\x1b\[/.test(seq))
      return Termcap.modcsi(';5', seq);

    if (seq.length == 1)
      return String.fromCharCode(seq.toUpperCase().charCodeAt(0) - 64);

    throw new Error('Invalid ctrl sequence: ' + seq);
  },

  'shift-ctrl': function(seq) {
    if (/\x1b\[/.test(seq))
      return Termcap.modcsi(';6', seq);

    if (seq.length == 1)
      return String.fromCharCode(seq.toUpperCase().charCodeAt(0) - 64);

    throw new Error('Invalid shift-ctrl sequence: ' + seq);
  },

  'ctrl-meta': function(seq) {
    if (/\x1b\[/.test(seq))
      return Termcap.modcsi(';7', seq);

    if (seq.length == 1) {
      return '\x1b' + String.fromCharCode(
          seq.toUpperCase().charCodeAt(0) - 64);
    }

    throw new Error('Invalid ctrl-meta sequence: ' + seq);
  },

  'shift-ctrl-meta': function(seq) {
    if (/\x1b\[/.test(seq))
      return Termcap.modcsi(';8', seq);

    if (seq.length == 1) {
      return '\x1b' + String.fromCharCode(
          seq.toUpperCase().charCodeAt(0) - 64);
    }

    throw new Error('Invalid shift-ctrl-meta sequence: ' + seq);
  },
};

/**
 * Similar to lib.f.replaceVars, but allows for multiple-parameter functions
 * and string and integer literals.
 *
 * TODO(rginda): String literals are brittle.  We only check that they start
 * and end with double-quotes.  Comma-splitting is also brittle, and strings
 * containing commas will cause trouble.
 */
Termcap.replaceVars_ = function(str, vars, functions) {
  var resolve = function(param, source) {
    if ((/^-?\d+$/.test(param)))
      return param;

    if ((/^\".*\"$/.test(param))) {
      return param.slice(1, -1);
    }

    if (typeof vars[param] == 'undefined') {
      throw new Error('Unknown variable: ' + source + ': ' + param);
    }

    return vars[param];
  };

  var doReplace = function(match, fn, paramstr) {
    if (!fn && !paramstr)
      return '%()';

    var ary;
    if (paramstr) {
      ary = paramstr.split(/\s*,\s*/);

      for (var i = 0; i < ary.length; ++i) {
        ary[i] = resolve(ary[i], '%' + fn + '(' + paramstr + ')');
      }
    }

    if (fn) {
      if (!(fn in functions))
        throw new Error('Unknown escape function: ' + fn);

      return functions[fn].apply(null, ary);
    }

    if (ary.length != 1)
      throw new Error('Expected single argument, got: ' + paramstr);

    return ary[0];
  };

  return str.replace(/%([a-z0-9+\-_]*)\(([^\)]*)\)/gi, doReplace);
};

Termcap.modcsi = function(mod, seq) {
  if (seq.length == 3) {
    // Some of the CSI sequences have zero parameters unless modified.
    return '\x1b[1' + mod + seq.substr(2, 1);
  }

  // Others always have at least one parameter.
  return seq.substr(0, seq.length - 1) + mod + seq.substr(seq.length - 1);
};
