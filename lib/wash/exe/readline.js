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

import Termcap from 'wash/termcap';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/**
 * @constructor
 * A partial clone of GNU readline.
 *
 * @param {JsExecuteContext} executeContext
 */
var Readline = function(executeContext) {
  this.executeContext = executeContext;

  this.executeContext.onStdIn.addListener(this.onStdIn_, this);

  this.promptString_ = executeContext.getArg('prompt-string', '');
  this.promptVars_ = null;

  this.history_ = [];
  this.historyIndex_ = 0;

  this.line = '';
  this.linePosition = 0;

  this.debug_ = false;

  // Cursor position when the read() started.
  this.cursorHome_ = null;

  // Cursor position after printing the prompt.
  this.cursorPrompt_ = null;

  this.verbose = false;

  this.nextUndoIndex_ = 0;
  this.undo_ = [['', 0]];

  // Global killRing shared across all readline instances.  WCGW?
  this.killRing_ = Readline.killRing;

  this.previousLineHeight_ = 0;

  this.pendingESC_ = false;

  this.tc_ = new Termcap();

  this.bindings = {};
  this.addKeyBindings(Readline.defaultBindings);
};

export {Readline};

/**
 * @param {JsExecuteContext} cx
 */
export var main = function(cx) {
  if (!cx.getTTY().isatty)
    return cx.closeError(new AxiomError.Runtime('Not a tty'));

  var readline = new Readline(cx);
  cx.ready();

  var inputHistory = cx.getArg('input-history', []);
  readline.read(inputHistory).then(
    function(value) {
      cx.closeOk(value);
    },
    function(err) {
      cx.closeError(err);
    });

  return cx.ephemeralPromise;
};

main.signature = {
  'input-history': '@',
  'prompt-string|p': '$'
};

export default main;

Readline.killRing = [];

/**
 * Default mapping of key sequence to readline commands.
 *
 * Uses Termcap syntax for the keys.
 */
Readline.defaultBindings = {
  '%(BACKSPACE)': 'backward-delete-char',
  '%(ENTER)': 'accept-line',

  '%(LEFT)': 'backward-char',
  '%(RIGHT)': 'forward-char',

  '%(UP)': 'previous-history',
  '%(DOWN)': 'next-history',

  '%(HOME)': 'beginning-of-line',
  '%(END)': 'end-of-line',
  '%(DELETE)': 'delete-char',

  '%ctrl("A")': 'beginning-of-line',
  '%ctrl("D")': 'delete-char-or-eof',
  '%ctrl("E")': 'end-of-line',
  '%ctrl("H")': 'backward-delete-char',
  '%ctrl("K")': 'kill-line',
  '%ctrl("L")': 'clear-home',
  '%ctrl("N")': 'next-history',
  '%ctrl("P")': 'previous-history',
  '%ctrl("Y")': 'yank',
  '%ctrl("_")': 'undo',
  '%ctrl("/")': 'undo',

  '%ctrl(LEFT)': 'backward-word',
  '%ctrl(RIGHT)': 'forward-word',

  // Meta and key at the same time.
  '%meta(BACKSPACE)': 'backward-kill-word',
  '%meta(DELETE)': 'kill-word',
  '%meta(">")': 'end-of-history',
  '%meta("<")': 'beginning-of-history',

  // Meta, then key.
  //
  // TODO(rginda): This would be better as a nested binding, like...
  //   '%(META)': { '%(DELETE)': 'kill-word', ... }
  // ...which would also allow provide for C-c and M-x multi key sequences.
  '%(META)%(DELETE)': 'kill-word',
  '%(META).': 'yank-last-arg',
};

/**
 * Read a line of input.
 *
 * Prints the given prompt, and waits while the user edits a line of text.
 * Provides editing functionality through the keys specified in defaultBindings.
 */
Readline.prototype.read = function(inputHistory) {
  this.history_ = [''];
  if (inputHistory) {
    // Ensure the history is nothing but strings.
    inputHistory = inputHistory.filter(function(el) {
      return typeof el == 'string';
    });
    this.history_ = this.history_.concat(inputHistory);
  }

  this.line = this.history_[0] = '';
  this.linePosition = 0;

  this.nextUndoIndex_ = 0;
  this.undo_ = [['', 0]];

  this.cursorHome_ = null;
  this.cursorPrompt_ = null;

  this.previousLineHeight_ = 0;

  this.print('%get-row-column()');

  return new Promise(function(resolve, reject) {
    this.resolve_ = resolve;
    this.reject_ = reject;
  }.bind(this));
};

/**
 * Find the start of the word under linePosition in the given line.
 */
Readline.getWordStart = function(line, linePosition) {
  var left = line.substr(0, linePosition);

  var searchEnd = left.search(/[a-z0-9][^a-z0-9]*$/i);
  left = left.substr(0, searchEnd);

  var wordStart = left.search(/[^a-z0-9][a-z0-9]*$/i);
  return (wordStart > 0) ? wordStart + 1 : 0;
};

/**
 * Find the end of the word under linePosition in the given line.
 */
Readline.getWordEnd = function(line, linePosition) {
  var right = line.substr(linePosition);

  var searchStart = right.search(/[a-z0-9]/i);
  right = right.substr(searchStart);

  var wordEnd = right.search(/[^a-z0-9]/i);

  if (wordEnd == -1)
    return line.length;

  return linePosition + searchStart + wordEnd;
};

/**
 * Register multiple key bindings.
 */
Readline.prototype.addKeyBindings = function(obj) {
  for (var key in obj) {
    this.addKeyBinding(key, obj[key]);
  }
};

/**
 * Register a single key binding.
 */
Readline.prototype.addKeyBinding = function(str, commandName) {
  this.addRawKeyBinding(this.tc_.input(str), commandName);
};

/**
 * Register a binding without passing through termcap.
 */
Readline.prototype.addRawKeyBinding = function(bytes, commandName) {
  this.bindings[bytes] = commandName;
};

/**
 *
 * @param {string} str
 * @param {Object=} opt_vars
 */
Readline.prototype.print = function(str, opt_vars) {
  this.executeContext.stdout(this.tc_.output(str, opt_vars || {}));
};

Readline.prototype.setPrompt = function(str, vars) {
  this.promptString_ = str;
  this.promptVars_ = vars;

  this.cursorPrompt_ = null;

  if (this.executeContext.isEphemeral('Ready'))
    this.dispatch('redraw-line');
};

/**
 *
 * @param {string} name
 * @param {*=} arg
 */
Readline.prototype.dispatch = function(name, arg) {
  this.commands[name].call(this, arg);
};

/**
 * Instance method version of getWordStart.
 */
Readline.prototype.getWordStart = function() {
  return Readline.getWordStart(this.line, this.linePosition);
};

/**
 * Instance method version of getWordEnd.
 */
Readline.prototype.getWordEnd = function() {
  return Readline.getWordEnd(this.line, this.linePosition);
};

Readline.prototype.killSlice = function(start, length) {
  if (length == -1)
    length = this.line.length - start;

  var killed = this.line.substr(start, length);
  this.killRing_.unshift(killed);

  this.line = (this.line.substr(0, start) + this.line.substr(start + length));
};

// TODO(rginda): Readline.on does not exist.
// Readline.prototype.dispatchMessage = function(msg) {
//   msg.dispatch(this, Readline.on);
// };

/**
 * Called when the terminal replys with the current cursor position.
 */
Readline.prototype.onCursorReport = function(row, column) {
  if (!this.cursorHome_) {
    this.cursorHome_ = {row: row, column: column};
    this.dispatch('redraw-line');
    return;
  }

  if (!this.cursorPrompt_) {
    this.cursorPrompt_ = {row: row, column: column};
    if (this.cursorHome_.row == this.cursorPrompt_.row) {
      this.promptLength_ =
          this.cursorPrompt_.column - this.cursorHome_.column;
    } else {
      var tty = this.executeContext.getTTY();

      var top = tty.columns - this.cursorPrompt_.column;
      var bottom = this.cursorHome_.column;
      var middle = tty.columns * (this.cursorPrompt_.row -
                                   this.cursorHome_.row);
      this.promptLength_ = top + middle + bottom;
    }

    this.dispatch('redraw-line');
    return;
  }

  console.warn('Unexpected cursor position report: ' + row + ', ' + column);
  return;
};

Readline.prototype.onStdIn_ = function(value) {
  if (typeof value != 'string')
    return;

  var string = value;

  var ary = string.match(/^\x1b\[(\d+);(\d+)R$/);
  if (ary) {
    this.onCursorReport(parseInt(ary[1], 10), parseInt(ary[2], 10));
    return;
  }

  if (string == '\x1b') {
    this.pendingESC_ = true;
    return;
  }

  if (this.pendingESC_) {
    string = '\x1b' + string;
    this.pendingESC_ = false;
  }

  var commandName = this.bindings[string];

  if (commandName) {
    if (this.verbose)
      console.log('dispatch: ' + JSON.stringify(string) + ' => ' + commandName);

    if (!(commandName in this.commands)) {
      throw new Error('Unknown command "' + commandName + '", bound to: ' +
                      string);
    }

    var previousLine = this.line;
    var previousPosition = this.linePosition;

    if (commandName != 'undo')
      this.nextUndoIndex_ = 0;

    this.dispatch(commandName, string);

    if (previousLine != this.line && previousLine != this.undo_[0][0])
      this.undo_.unshift([previousLine, previousPosition]);

  } else if (/^[\x20-\xff]+$/.test(string)) {
    this.nextUndoIndex_ = 0;
    this.commands['self-insert'].call(this, string);
  } else if (this.debug_) {
    console.log('unhandled: ' + JSON.stringify(string));
  }
};

Readline.prototype.commands = {};

/**
 * @this {Readline}
 */
Readline.prototype.commands['clear-home'] = function(string) {
  this.print('%clear-terminal()%set-row-column(row, column)',
             {row: 0, column: 0});
  this.cursorHome_ = null;
  this.cursorPrompt_ = null;
  this.print('%get-row-column()');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['redraw-line'] = function(string) {
  if (!this.cursorHome_) {
    console.warn('readline: Home cursor position unknown, won\'t redraw.');
    return;
  }

  if (!this.cursorPrompt_) {
    // We don't know where the cursor ends up after printing the prompt.
    // We can't just depend on the string length of the prompt because
    // it may have non-printing escapes.  Instead we echo the prompt and then
    // locate the cursor.
    this.print('%set-row-column(row, column)',
               { row: this.cursorHome_.row,
                 column: this.cursorHome_.column,
               });
    this.print(this.promptString_, this.promptVars_);
    this.print('%get-row-column()');
    return;
  }

  this.print('%set-row-column(row, column)%(line)',
             { row: this.cursorPrompt_.row,
               column: this.cursorPrompt_.column,
               line: this.line
             });

  var tty = this.executeContext.getTTY();

  var totalLineLength = this.cursorHome_.column - 1 + this.promptLength_ +
      this.line.length;
  var totalLineHeight = Math.ceil(totalLineLength / tty.columns);
  var additionalLineHeight = totalLineHeight - 1;

  var lastRowFilled = (totalLineLength % tty.columns) === 0;
  if (!lastRowFilled)
    this.print('%erase-right()');

  if (totalLineHeight < this.previousLineHeight_) {
    for (var i = totalLineHeight; i < this.previousLineHeight_; i++) {
      this.print('%set-row-column(row, 1)%erase-right()',
                 {row: this.cursorPrompt_.row + i});
    }
  }

  this.previousLineHeight_ = totalLineHeight;

  if (totalLineLength >= tty.columns) {
    // This line overflowed the terminal width.  We need to see if it also
    // overflowed the height causing a scroll that would invalidate our idea
    // of the cursor home row.
    var scrollCount;

    if (this.cursorHome_.row + additionalLineHeight == tty.rows &&
        lastRowFilled) {
      // The line was exactly long enough to fill the terminal width and
      // and height.  Insert a newline to hold the new cursor position.
      this.print('\n');
      scrollCount = 1;
    } else {
      scrollCount = this.cursorHome_.row + additionalLineHeight - tty.rows;
    }

    if (scrollCount > 0) {
      this.cursorPrompt_.row -= scrollCount;
      this.cursorHome_.row -= scrollCount;
    }
  }

  this.dispatch('reposition-cursor');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['abort-line'] = function() {
  this.resolve_(null);
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['reposition-cursor'] = function(string) {
  // Count the number or rows it took to render the current line at the
  // current terminal width.
  var tty = this.executeContext.getTTY();
  var rowOffset = Math.floor((this.cursorPrompt_.column - 1 +
                              this.linePosition) / tty.columns);
  var column = (this.cursorPrompt_.column + this.linePosition -
                (rowOffset * tty.columns));
  this.print('%set-row-column(row, column)',
             { row: this.cursorPrompt_.row + rowOffset,
               column: column
             });
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['self-insert'] = function(string) {
  if (this.linePosition == this.line.length) {
    this.line += string;
  } else {
    this.line = this.line.substr(0, this.linePosition) + string +
        this.line.substr(this.linePosition);
  }

  this.linePosition += string.length;

  this.history_[0] = this.line;

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['accept-line'] = function() {
  this.historyIndex_ = 0;
  if (this.line && this.line != this.history_[1])
    this.history_.splice(1, 0, this.line);
  this.print('\r\n');
  this.resolve_(this.line);
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['beginning-of-history'] = function() {
  this.historyIndex_ = this.history_.length - 1;
  this.line = this.history_[this.historyIndex_];
  this.linePosition = this.line.length;

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['end-of-history'] = function() {
  this.historyIndex_ = this.history_.length - 1;
  this.line = this.history_[this.historyIndex_];
  this.linePosition = this.line.length;

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['previous-history'] = function() {
  if (this.historyIndex_ == this.history_.length - 1) {
    this.print('%bell()');
    return;
  }

  this.historyIndex_ += 1;
  this.line = this.history_[this.historyIndex_];
  this.linePosition = this.line.length;

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['next-history'] = function() {
  if (this.historyIndex_ === 0) {
    this.print('%bell()');
    return;
  }

  this.historyIndex_ -= 1;
  this.line = this.history_[this.historyIndex_];
  this.linePosition = this.line.length;

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['kill-word'] = function() {
  var start = this.linePosition;
  var length =  this.getWordEnd() - start;
  this.killSlice(start, length);

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['backward-kill-word'] = function() {
  var start = this.getWordStart();
  var length = this.linePosition - start;
  this.killSlice(start, length);
  this.linePosition = start;

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['kill-line'] = function() {
  this.killSlice(this.linePosition, -1);

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['yank'] = function() {
  var text = this.killRing_[0];
  this.line = (this.line.substr(0, this.linePosition) +
               text +
               this.line.substr(this.linePosition));
  this.linePosition += text.length;

  this.dispatch('redraw-line');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['yank-last-arg'] = function() {
  if (this.history_.length < 2)
    return;

  var last = this.history_[1];
  var i = Readline.getWordStart(last, last.length - 1);
  if (i != -1)
    this.dispatch('self-insert', last.substr(i));
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['delete-char-or-eof'] = function() {
  if (!this.line.length) {
    this.dispatch('abort-line');
  } else {
    this.dispatch('delete-char');
  }
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['delete-char'] = function() {
  if (this.linePosition < this.line.length) {
    this.line = (this.line.substr(0, this.linePosition) +
                 this.line.substr(this.linePosition + 1));
    this.dispatch('redraw-line');
  } else {
    this.print('%bell()');
  }
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['backward-delete-char'] = function() {
  if (this.linePosition > 0) {
    this.linePosition -= 1;
    this.line = (this.line.substr(0, this.linePosition) +
                 this.line.substr(this.linePosition + 1));
    this.dispatch('redraw-line');
  } else {
    this.print('%bell()');
  }
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['backward-char'] = function() {
  if (this.linePosition > 0) {
    this.linePosition -= 1;
    this.dispatch('reposition-cursor');
  } else {
    this.print('%bell()');
  }
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['forward-char'] = function() {
  if (this.linePosition < this.line.length) {
    this.linePosition += 1;
    this.dispatch('reposition-cursor');
  } else {
    this.print('%bell()');
  }
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['backward-word'] = function() {
  this.linePosition = this.getWordStart();
  this.dispatch('reposition-cursor');
};


/**
 * @this {Readline}
 */
Readline.prototype.commands['forward-word'] = function() {
  this.linePosition = this.getWordEnd();
  this.dispatch('reposition-cursor');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['beginning-of-line'] = function() {
  if (this.linePosition === 0) {
    this.print('%bell()');
    return;
  }

  this.linePosition = 0;
  this.dispatch('reposition-cursor');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['end-of-line'] = function() {
  if (this.linePosition == this.line.length) {
    this.print('%bell()');
    return;
  }

  this.linePosition = this.line.length;
  this.dispatch('reposition-cursor');
};

/**
 * @this {Readline}
 */
Readline.prototype.commands['undo'] = function() {
  if ((this.nextUndoIndex_ == this.undo_.length)) {
    this.print('%bell()');
    return;
  }

  this.line = this.undo_[this.nextUndoIndex_][0];
  this.linePosition = this.undo_[this.nextUndoIndex_][1];

  this.dispatch('redraw-line');

  this.nextUndoIndex_ += 2;
};
