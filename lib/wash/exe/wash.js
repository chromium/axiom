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
import AxiomEvent from 'axiom/core/event';

import Arguments from 'axiom/fs/arguments';
import DataType from 'axiom/fs/data_type';
import FileSystemManager from 'axiom/fs/base/file_system_manager';
import OpenContext from 'axiom/fs/base/open_context';
import Path from 'axiom/fs/path';

import Stdio from 'axiom/fs/stdio';
import MemoryStreamBuffer from 'axiom/fs/stream/memory_stream_buffer';
import ReadableFileStreamBuffer from 'axiom/fs/stream/readable_file_stream_buffer';
import WritableFileStreamBuffer from 'axiom/fs/stream/writable_file_stream_buffer';

import JsFileSystem from 'axiom/fs/js/file_system';
import JsEntry from 'axiom/fs/js/entry';
//TODO: import domfsUtil from 'axiom/fs/dom/domfs_util';

import Parse from 'wash/parse';
import Termcap from 'wash/termcap';
import Washrc from 'wash/washrc';
import version from 'wash/version';
import washUtil from 'wash/wash_util';

/** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
var ExecuteContext;

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef ReadResult$$module$axiom$fs$read_result */
var ReadResult;

/** @typedef {{name: string, value: *}} */
var Signal;

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/** @typedef StreamBuffer$$module$axiom$fs$stream$stream_buffer */
var StreamBuffer;

/**
 * @constructor
 *
 * The shell read-eval-print loop.
 *
 * @param {JsExecuteContext} executeContext
 */
export var Wash = function(executeContext) {
  /** @type {JsExecuteContext} */
  this.executeContext = executeContext;

  /** @type {!FileSystemManager} */
  this.fileSystemManager = executeContext.fileSystemManager;

  /** @type {string} */
  this.historyFile = executeContext.getEnv('$HISTFILE', '');

  /** @type {Array<string>} */
  this.inputHistory = [];

  /**
   * @private @type {Array<JsExecuteContext>}
   * The list of currently active jobs.
   */
  this.executeContextList_ = [];

  /**
   * @private @type {Array<JsExecuteContext>}
   */
  this.foregroundContext_ = null;

  /**
   * @private @type {Termcap}
   */
  this.tc_ = new Termcap();

  /**
   * @private @type {string}
   */
  this.promptString_ = '';

  var builtins = {};
  for (var name in Wash.builtins) {
    builtins[name] = [
      Wash.builtins[name][0],
      Wash.builtins[name][1].bind(null, this)
    ];
  }

  this.builtinsFS = new JsFileSystem();
  this.builtinsFS.rootDirectory.install(builtins);

  if (!this.executeContext.getEnv('$PWD')) {
    this.executeContext.setEnv('$PWD', this.executeContext.getPwd());
  }

  if (!this.executeContext.getEnv('$HOME')) {
    this.executeContext.setEnv('$HOME',
        this.fileSystemManager.defaultFileSystem.rootPath.combine('home').spec);
  }

  this.setPrompt();
};

/**
 * Set to true to make the shell exit if a subcommand errors.
 *
 * This can help debug infinite-loop at startup issues.
 *
 * @type {boolean}
 */
Wash.exitOnError = false;

/** @type {Object<string, Array>} */
Wash.builtins = {
  'cd': [
    { '_': '@' },
    /**
     * @param {Wash} wash
     * @param {JsExecuteContext} cx
     * @return {void}
     */
    function(wash, cx) {
      cx.ready();

      /** @type {Path} */
      var list = cx.getArg('_', []);
      var path = wash.absPath(list[0] || cx.getEnv('$HOME', cx.getPwd()));

      wash.fileSystemManager.stat(path).then(
        function(/** StatResult */ statResult) {
          if (!(statResult.mode & Path.Mode.D)) {
            cx.closeError(
              new AxiomError.TypeMismatch('dir', path.originalSpec));
            return;
          }

          wash.executeContext.setEnv('$PWD', path.spec);
          cx.closeOk();
        }
      ).catch(function(err) {
        cx.closeError(err);
      });
    }
  ],

  'env-del': [
    { '_': '@' },
    /**
     * @param {Wash} wash
     * @param {JsExecuteContext} cx
     * @return {void}
     */
    function(wash, cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      for (var i = 0; i < list.length; i++) {
        wash.executeContext.delEnv(list[i]);
      }

      cx.closeOk();
    }
  ],

  'env-get': [
    { '_': '@' },
    /**
     * @param {Wash} wash
     * @param {JsExecuteContext} cx
     * @return {void}
     */
    function(wash, cx) {
      cx.ready();

      var list = cx.getArg('_', []);
      if (!list.length) {
        cx.closeOk(wash.executeContext.getEnvs());
        return;
      }

      var rv = {};
      for (var i = 0; i < list.length; i++) {
        rv[list[i]] = wash.executeContext.getEnv(list[i]);
      }

      cx.closeOk(rv);
    }
  ],

  'env-set': [
    { '_': '@' },
    /**
     * @param {Wash} wash
     * @param {JsExecuteContext} cx
     * @return {void}
     */
    function(wash, cx) {
      cx.ready();

      var list = cx.getArg('_');
      for (var i = 0; i < list.length; i++) {
        var map = list[i];
        if (typeof map != 'object') {
          cx.closeError(
              new AxiomError.TypeMismatch('Object', map));
          return;
        }

        for (var name in map) {
          var value = map[name];
          var sigil = name.substr(0, 1);
          if ('$@%'.indexOf(sigil) == -1) {
            cx.closeError(new AxiomError.Invalid('name', name));
            return;
          }
          if (!Arguments.typeCheck(value, sigil)) {
            cx.closeError(new AxiomError.TypeMismatch(sigil, value));
            return;
          }
          wash.executeContext.setEnv(name, value);
        }
      }

      cx.closeOk();
    }
  ]
};

/**
 * The main entrypoint when invoked as a JsExecutable.
 *
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export default Wash.main = function(cx) {
  var wash = new Wash(cx);

  if (typeof window != 'undefined')
    window.wash_ = wash;  // Console debugging aid.

  cx.ready();

  if (cx.getArg('help')) {
    cx.stdout.write([
      'usage: wash [--no-welcome]',
      'Read-eval-print-loop.',
      '',
      'This command will read a line of text from the user, evaluate it as',
      'a command, print the result, and start over again.',
      '',
      'If the --no-welcome argument is provided, the startup welcome message',
      'will not be printed.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  if (cx.getArg('welcome', true)) {
    cx.stdout.write('Welcome to wash version ' + version + '.\n');
    cx.stdout.write('Type `exit` or Ctrl-D to exit.\n');
  }

  var repl = wash.readEvalPrintLoop.bind(wash);
  wash.loadFile(wash.historyFile).then(function(history) {
    if (history) {
      this.inputHistory = history;
    }
    this.executeWashrc().then(function() {
      repl();
    });
  }.bind(wash)).catch(repl);
  // NOTE: cx will get closed in Wash.prototype.exit()
};

Wash.main.signature = {
  'help|h': '?',
  'welcome|w': '?'
};

/**
 * Execute the washrc file.
 *
 * @return {!Promise<null>}
 */
Wash.prototype.executeWashrc = function() {
  var washrc = new Washrc(this.executeContext);
  return washrc.execute(this);
};

/**
 * @param {string} name
 * @return {!Promise<Array>}
 */
Wash.prototype.loadFile = function(name) {
  if (!name) {
    return Promise.reject(new AxiomError.Invalid('name', name));
  }
  return this.fileSystemManager.readFile(
      new Path(name), DataType.UTF8String).then(
    function(/** ReadResult */ result) {
      try {
        if (typeof result.data !== 'string') {
          return Promise.reject(new AxiomError.TypeMismatch(
              'string', typeof result.data));
        }
        var data = JSON.parse(result.data);
        if (data instanceof Array)
          return Promise.resolve(data);
      } catch (ex) {
        this.errorln('Error loading: ' + name);
        this.printErrorValue(ex);
      }

      return Promise.resolve(null);
    }.bind(this)
  ).catch(
    function(err) {
      if (!AxiomError.NotFound.test(err))
        this.printErrorValue(err);

      return Promise.resolve([]);
    }.bind(this)
  );
};

/**
 * @param {string} path
 * @return {!Path}
 */
Wash.prototype.absPath = function(path) {
  /** @type {string} */
  var pwd = this.executeContext.getPwd();
  return Path.abs(pwd, path);
};

/**
 * @return {void}
 */
Wash.prototype.setPrompt = function() {
  this.promptString_ = this.tc_.output('%set-attr(FG_BOLD, FG_CYAN)' +
      this.executeContext.getPwd() + '> %set-attr()');
};

/**
  * @typedef {{fileSystem: !FileSystem, statResult: !StatResult, path: !Path}}
  */
var FindExecutableResult;

/**
  * Returns the StatResult of a builtin command given its path, or null if
  * path does not resolve to a known builtin command.
  *
  * @param {!string} pathSpec
  * @return {!Promise<!FindExecutableResult>}
  */
Wash.prototype.findBuiltinOrExecutable = function(pathSpec) {
  return this.findBuiltin(pathSpec).then(function(result) {
    if (result) {
      return Promise.resolve(result);
    }

    return washUtil.findExecutable(this.executeContext, pathSpec);
  }.bind(this));
};

/**
  * Returns the StatResult of a builtin command given its path, or null if
  * path does not resolve to a known builtin command.
  *
  * @param {!string} pathSpec
  * @return {!Promise<?FindExecutableResult>}
  */
Wash.prototype.findBuiltin = function(pathSpec) {
  var builtinPath = this.builtinsFS.rootPath.combine(pathSpec);
  return this.builtinsFS.stat(builtinPath).then(
    function(statResult) {
      return Promise.resolve({
        fileSystem: this.builtinsFS,
        statResult: statResult,
        path: builtinPath
      });
    }.bind(this)
  ).catch(function(error) {
    if (AxiomError.NotFound.test(error))
      return null;
    return Promise.reject(error);
  });
};

/**
 * @return {!Promise<*>}
 */
Wash.prototype.read = function() {
  return washUtil.findExecutable(this.executeContext, 'readline').then(
    function(result) {
      return this.executeContext.call(
          result.path,
          { 'prompt-string': this.promptString_,
            'input-history': this.inputHistory
          });
    }.bind(this));
};

/**
 * Evaluate a single line of input.
 *
 * @param {string} str
 * @return {!Promise<*>} Resolves to result of the evaluation.
 */
Wash.prototype.evaluate = function(str) {
  str = str.trim();

  if (!str)
    return Promise.resolve();

  if (str != this.inputHistory[0])
    this.inputHistory.unshift(str);

  var commands = this.parseShellInput(str);
  return this.dispatch(commands).then(
    function(response) {
      this.setPrompt();
      return response;
    }.bind(this));
};

/**
 * Read a single line of input, eval it, print the result or an error.
 *
 * @return {Promise<*>} Resolves to result of the evaluation.
 */
Wash.prototype.readEvalPrint = function() {
  return this.read().then(
    function(result) {
      if (result === null || result === 'exit') {
        if (!result)
          this.executeContext.stdout.write('exit\n');
        return this.exit();
      }

      if (typeof result != 'string') {
        return Promise.reject(new AxiomError.Runtime(
            'Unexpected type from readline: ' + (typeof result)));
      }

      return this.evaluate(result);
    }.bind(this)
  ).catch(
    function(error) {
      this.printErrorValue(error);
      return Promise.reject(error);
    }.bind(this)
  );
};

/**
 * Read-eval-print-loop.
 *
 * @return {Promise<*>} Resolves to the value of the final evaluation.
 */
Wash.prototype.readEvalPrintLoop = function() {
  return this.readEvalPrint().then(
    function(value) {
      if (this.executeContext.isEphemeral('Ready'))
        return this.readEvalPrintLoop();

      return Promise.resolve(value);
    }.bind(this)
  ).catch(
    function(value) {
      if (!Wash.exitOnError) {
        if (this.executeContext.isEphemeral('Ready'))
          return this.readEvalPrintLoop();
      }

      return Promise.reject(value);
    }.bind(this)
  );
};

/**
 * @constructor
 * @param {!string} operator
 * @param {!string} pathSpec
 */
Wash.RedirectInfo = function(operator, pathSpec) {
  /** @const @type {!string} */
  this.pathSpec = pathSpec;
  /** @const @type {!string} */
  this.mode = Wash.RedirectInfo.OP2MODE_[operator];

  if (!this.mode || (this.mode !== 'pipe' && this.pathSpec === ''))
    throw new AxiomError.Invalid('I/O redirection', operator + pathSpec);
};

Wash.RedirectInfo.OP2MODE_ = {
  '<': 'r',
  '>': 'wct',
  '>>': 'wc',
  '|': 'pipe'
};

Wash.RedirectInfo.PIPE = new Wash.RedirectInfo('|', '');

/**
 * @constructor
 * @param {!string} pathSpec
 * @param {!string} argv
 * @param {?Wash.RedirectInfo} redirIn
 * @param {?Wash.RedirectInfo} redirOut
 */
Wash.Command = function(pathSpec, argv, redirIn, redirOut) {
  /** @const @type {!string} */
  this.pathSpec = pathSpec;
  /** @const @type {!string} */
  this.argv = argv;
  /** @const @type {?Wash.RedirectInfo} */
  this.redirIn = redirIn;
  /** @const @type {?Wash.RedirectInfo} */
  this.redirOut = redirOut;
  /** @type {!boolean} */
  this.runnable = true;
};

/**
 * Matches a command line with possible stdout redirection to a file:
 *    command [arg1 arg2 ...] [< some_file] [> some_file]
 *
 * @private
 * @const
 */
Wash.CMD_WITH_IO_REDIRECT_RE_ = /^([^<>]+?)(?:\s+([^<>]+?))?\s*([<>].+)?$/;
Wash.STDIN_REDIRECT_RE_ = /(<)\s*([^<>\s]+)?/;
Wash.STDOUT_REDIRECT_RE_ = /(>>?)\s*([^<>\s]+)?/;

/**
 * Parse a line of shell input into the path and the argument string.
 *
 * @return {!Wash.Command}
 */
Wash.prototype.parseShellCommand = function(str, pipeIn, pipeOut) {
  var match = Wash.CMD_WITH_IO_REDIRECT_RE_.exec(str);

  if (!match)
    throw new AxiomError.Invalid('command line', str);

  var path = match[1];
  var argv = match[2] || '';
  var redirStr = match[3];
  var redirIn = null;
  var redirOut = null;
  // TODO(ussuri): Add redirErr, too.

  if (path.substr(0, 2) == './') {
    /** @type {string} */
    var pwd = this.executeContext.getEnv('$PWD',
        this.executeContext.fileSystemManager.defaultFileSystem.rootPath.spec);
    path = pwd + '/' + path.substr(2);
  }

  if (redirStr) {
    match = Wash.STDIN_REDIRECT_RE_.exec(redirStr);
    if (match) {
      redirIn = new Wash.RedirectInfo(match[1], match[2]);
    }
    match = Wash.STDOUT_REDIRECT_RE_.exec(redirStr);
    if (match) {
      redirOut = new Wash.RedirectInfo(match[1], match[2]);
    }
  }

  if (!redirIn && pipeIn) {
    redirIn = Wash.RedirectInfo.PIPE;
  }

  if (!redirOut && pipeOut) {
    redirOut = Wash.RedirectInfo.PIPE;
  }

  return new Wash.Command(path, argv, redirIn, redirOut);
};

Wash.prototype.parseShellInput = function(str) {
  var commands = [];
  var commandStrs = str.split(/\s*\|\s*/);
  for (var i = 0; i < commandStrs.length; ++i) {
    var pipeIn = i > 0;
    var pipeOut = i < commandStrs.length - 1;
    var cmd = this.parseShellCommand(commandStrs[i], pipeIn, pipeOut);
    commands.push(cmd);
  }
  return commands;
};

/**
 * @constructor
 * @struct
 * @param {!Stdio} stdio
 */
var CreateStdioResult = function(stdio) {
  /** @const @type {!Stdio} */
  this.stdio = stdio;
  /** @const @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
};

/**
 * Create a chain of Stdios that are cloned from our master stdio, but piped
 * into each other and possibly redirected from/to a file. Redirection takes
 * precedence over piping: e.g. if a command is on the RHS of a pipe but also
 * has its stdin redirected from a file, the pipe is ignored.
 *
 * @param {!Array<Wash.Command>} commands
 * @return {!Promise<!Array<!CreateStdioResult>>}
 */
Wash.prototype.createStdios = function(commands) {
  /** @const @type {!Array<!CreateStdioResult>} */
  var stdios = [];
  /** @const @type {!Array<!Promise>} */
  var redirFilePromises = [];
  /** @type {MemoryStreamBuffer} */
  var curPipe = null;

  /**
   * @param {!Wash} wash
   * @param {!StreamBuffer} buffer
   * @return {void}
   */
  var closeBufferOnInterrupt = function(wash, buffer) {
    wash.executeContext.stdio.signal.onData.addListener(function(signal) {
      if (signal.name === 'interrupt') {
        buffer.close('Interrupted');
      }
    });
  };

  /**
   * @param {!Wash} wash
   * @param {!(ReadableFileStreamBuffer|WritableFileStreamBuffer)} fileBuffer
   * @param {!Wash.Command} command
   * @return {void}
   */
  var openRedirFileBuffer = function(wash, buffer, command) {
    closeBufferOnInterrupt(wash, buffer);
    return buffer.open().catch(function(error) {
      // Just report the error: if open() fails, file buffer will auto-close.
      wash.printErrorValue(error);
      command.runnable = false;
    });
  };

  for (var i = 0; i < commands.length; ++i) {
    var cmd = commands[i];
    var stdio = this.executeContext.stdio.clone();
    var stdioResult = new CreateStdioResult(stdio);

    // NOTE: redirection to or from a file take precedence over piping; given:
    //   $ cat foo.txt | sort < bar.txt > baz.txt | tee goo.txt
    // `sort` will ignore the both piped stdin and stdout, reading from bar.txt
    // and writing to baz.txt instead.

    if (cmd.redirIn) {
      if (cmd.redirIn === Wash.RedirectInfo.PIPE) {
        if (!curPipe) {
          // The pipe's LHS command's stdout was redirected to a file, so we
          // have no pipe: create a dummy one (/dev/null) for this command.
          curPipe = new MemoryStreamBuffer();
        }
        // `cmd` is the RHS of a pipe: consume the readable end of a buffer
        // created on the previous loop iteration for the LHS command.
        stdio.stdin = curPipe.readableStream;
      } else {
        // TODO(ussuri): A fixed data type is temporary. Switch to
        // auto-detection once the data type story is sorted out.
        var fileReader = new ReadableFileStreamBuffer(
            this.fileSystemManager,
            this.absPath(cmd.redirIn.pathSpec),
            DataType.UTF8String,
            cmd.redirIn.mode);
        redirFilePromises.push(openRedirFileBuffer(this, fileReader, cmd));
        stdio.stdin = fileReader.readableStream;
      }
    }

    if (cmd.redirOut) {
      if (cmd.redirOut === Wash.RedirectInfo.PIPE) {
        curPipe = new MemoryStreamBuffer();
        closeBufferOnInterrupt(this, curPipe);
        stdioResult.onClose.addListener(function(reason, value) {
          if (reason === 'ok') {
            curPipe.end();
          } else {
            curPipe.close(value);
          }
        });
        stdio.stdout = curPipe.writableStream;
      } else {
        curPipe = null;
        // TODO(ussuri): A fixed data type is temporary. Switch to
        // auto-detection once the data type story is sorted out.
        var fileWriter = new WritableFileStreamBuffer(
            this.fileSystemManager,
            this.absPath(cmd.redirOut.pathSpec),
            DataType.UTF8String,
            cmd.redirOut.mode);
        redirFilePromises.push(openRedirFileBuffer(this, fileWriter, cmd));
        stdioResult.onClose.addListener(function(reason, value) {
          if (reason === 'ok') {
            fileWriter.end();
          } else {
            fileWriter.close(value);
          }
        });
        stdio.stdout = fileWriter;
      }
    }

    stdios.push(stdioResult);
  }

  return Promise.all(redirFilePromises).then(function(_) {
    return stdios;
  });
};

/**
 * Dispatche execution of a command pipe consisting of one or more commands,
 * which can also have their stdin and/or stdout redirected from/to a file,
 * and return a promise that resolves with an array of commands' results.
 *
 * @param {!Array<!Wash.Command>} commands
 * @return {!Promise<!Array<*>>}
 */
Wash.prototype.dispatch = function(commands) {
  return this.createStdios(commands).then(
      function(/** !Array<!CreateStdioResult> */stdios) {
    /** @type {!Array<!Promise<undefined>> } */
    var promises = [];
    // Going from right to left is important: we want to fire up each pipe's
    // consumer before its producer, so the consumer can prepare for the data
    // about to be piped in.
    for (var i = commands.length - 1; i >= 0; --i) {
      var cmd = commands[i];
      var stdioResult = stdios[i];
      if (cmd.runnable) {
        promises.push(this.dispatchOne(cmd, stdioResult));
      } else {
        // The command is not runnable: if it's an LHS of a pipe, then make the
        // corresponding stdout look like an empty /dev/null to the RHS command
        // by ending it in a delayed fashion. As soon as the RHS resumes its
        // stdin (connected to this stdout) or explicitly reads from it, it will
        // receive an onEnd for it.
        if (cmd.redirOut === Wash.RedirectInfo.PIPE) {
          var stdout = stdioResult.stdio.stdout;
          stdout.write('', stdout.end.bind(stdout));
        }
      }
    }
    return Promise.all(promises);
  }.bind(this));
};

/**
 * Run the given path with the given argv string, returning a promise that
 * resolves to the result of the evaluation.
 *
 * For relative paths we'll search the builtins as well as $PATH.  The argv
 * string will be parsed according to the sigil of the target executable.
 *
 * @param {!Wash.Command} command
 * @param {!CreateStdioResult} stdioResult
 */
Wash.prototype.dispatchOne = function(command, stdioResult) {
  return this.findBuiltinOrExecutable(command.pathSpec).then(function(result) {
    var stdio = stdioResult.stdio;
    var arg = this.parseArgv(result.statResult.signature, command.argv);

    // TODO(ussuri): Move this into ExecuteContext.call() and remove
    // opt_onClose there?
    var onClose = function(reason, value) {
      stdioResult.onClose.fire(reason, value);
      if (reason === 'ok') {
        if (typeof value !== 'undefined' && typeof value !== 'number' &&
            value !== null) {
          stdio.stdout.write(JSON.stringify(value, null, '  ') + '\n');
        }
      }
    };

    return this.executeContext.call(
        result.path, arg, stdio, onClose, result.fileSystem);
  }.bind(this));
};

/**
 * @param {Object} signature
 * @param {string} argv
 * @return {Arguments}
 */
Wash.prototype.parseArgv = function(signature, argv) {
  if (!argv)
    argv = '';

  var parse = new Parse(argv);
  return parse.parseArgs(signature);
};

/**
 * @param {*} value
 * @param {boolean=} opt_withStackTrace
 */
Wash.prototype.printErrorValue = function(value, opt_withStackTrace) {
  var args = [];
  if (!(value instanceof AxiomError)) {
    if (value instanceof Error) {
      //console.log('printErrorValue:', value, value.stack);
      var stack = value.stack;
      value = new AxiomError.Runtime(value.message);
      value.stack = stack;
    } else if (value instanceof Object) {
      value = new AxiomError.Runtime(value.toString());
    } else {
      value = new AxiomError.Runtime(JSON.stringify(value));
    }
  }

  for (var key in value.errorValue) {
    args.push(key + ': ' + JSON.stringify(value.errorValue[key]));
  }

  var str = this.tc_.output('%set-attr(FG_BOLD, FG_RED)Error%set-attr(): ' +
                            value.errorName);
  if (args.length)
    str += ' {' + args.join(', ') + '}';

  if (opt_withStackTrace && !AxiomError.Interrupt.test(value) && value.stack)
    str += '\n' + value.stack;

  this.errorln(str);
};

Wash.prototype.exit = function() {
  if (!this.historyFile)
    return this.executeContext.closeOk(null);

  return this.fileSystemManager.writeFile(
      new Path(this.historyFile),
      DataType.UTF8String,
      JSON.stringify(this.inputHistory, null, '  ') + '\n'
  ).then(
      function() {
        return this.executeContext.closeOk(null);
      }.bind(this)
  ).catch(
    function(error) {
      // TODO: writeFile should only raise AxiomErrors.
      //if (error instanceof window.FileError)
      //  error = domfsUtil.convertFileError(this.historyFile, error);

      this.printErrorValue(error);
      this.executeContext.closeOk(null);
    }.bind(this)
  );
};

/**
 * @param {!string} str
 * @return {void}
 */
Wash.prototype.println = function(str) {
  this.executeContext.stdout.write(str + '\n');
};

/**
 * @param {!string} str
 * @return {void}
 */
Wash.prototype.errorln = function(str) {
  this.executeContext.stderr.write(str + '\n');
};
