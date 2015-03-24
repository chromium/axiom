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

import Arguments from 'axiom/fs/arguments';
import DataType from 'axiom/fs/data_type';
import FileSystemManager from 'axiom/fs/base/file_system_manager';
import OpenContext from 'axiom/fs/base/open_context';
import Path from 'axiom/fs/path';

import JsFileSystem from 'axiom/fs/js/file_system';
import JsEntry from 'axiom/fs/js/entry';
//TODO: import domfsUtil from 'axiom/fs/dom/domfs_util';

import Parse from 'wash/parse';
import Termcap from 'wash/termcap';
import Washrc from 'wash/washrc';
import version from 'wash/version';

/** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
var ExecuteContext;

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef ReadResult$$module$axiom$fs$read_result */
var ReadResult;

/** @typedef {{name: string, value: *}} */
var Signal;

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

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

  this.executeContext.stdio.signal.onData.addListener(this.onSignal_, this);

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
      );
    }
  ],

  'env-del': [
    { '_': '@' },
    /**
     * @param {Wash} wash
     * @param {JsExecuteContext} cx
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
  'welcome': '?'
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
 */
Wash.prototype.loadFile = function(name) {
  if (!name) {
    return Promise.reject(new AxiomError.Invalid('name', name));
  }
  return this.fileSystemManager.readFile(
      new Path(name), DataType.UTF8String).then(
    function(/** ReadResult */ result) {
      try {
        if (typeof result.data != 'string') {
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
 * @return {Path}
 */
Wash.prototype.absPath = function(path) {
  /** @type {string} */
  var pwd = this.executeContext.getEnv('$PWD',
      this.executeContext.fileSystemManager.defaultFileSystem.rootPath.spec);
  return Path.abs(pwd, path);
};

/**
 * @return {void}
 */
Wash.prototype.setPrompt = function() {
  this.promptString_ = this.tc_.output('%set-attr(FG_BOLD, FG_CYAN)' +
      this.executeContext.getEnv('$PWD') + '> %set-attr()');
};

/**
 * @param {string} pathSpec
 * @return {!Promise<!{path: !Path, statResult: StatResult}>}
 */
Wash.prototype.findExecutable = function(pathSpec) {
  var rootPath = this.fileSystemManager.defaultFileSystem.rootPath;
  var searchList = this.executeContext.getEnv('@PATH', [rootPath.spec]);

  /** @type {function(): !Promise<!{path: !Path, statResult: StatResult}>} */
  var searchNextPath = function() {
    if (!searchList.length)
      return Promise.reject(new AxiomError.NotFound('path', pathSpec));

    var currentPrefix = searchList.shift();
    var currentPath = new Path(currentPrefix).combine(pathSpec);
    return this.fileSystemManager.stat(currentPath).then(
      function(statResult) {
        if (statResult.mode & Path.Mode.X)
          return Promise.resolve({path: currentPath,
                                  statResult: statResult});
        return searchNextPath();
      }
    ).catch(function(value) {
      if (AxiomError.NotFound.test(value))
        return searchNextPath();

      return Promise.reject(value);
    });
  }.bind(this);

  return searchNextPath();
};

/**
 * @return {!Promise<*>}
 */
Wash.prototype.read = function() {
  return this.findExecutable('readline').then(
    function(result) {
      return this.executeContext.call(
          this.fileSystemManager,
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

  var ary = this.parseShellInput(str);
  return this.dispatch(ary[0], ary[1]).then(
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

      return this.evaluate(result).then(
        function(value) {
          if (typeof value != 'undefined' && typeof value != 'number' &&
              value !== null) {
            this.println(JSON.stringify(value, null, '  '));
          }

          return Promise.resolve(value);
        }.bind(this));
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
 * Parse a line of shell input into the path and the argument string.
 *
 * @return {Array<string>}
 */
Wash.prototype.parseShellInput = function(str) {
  var pos = str.indexOf(' ');
  var path, argv;
  if (pos > -1) {
    path = str.substr(0, pos);
    argv = str.substr(pos + 1).trim();
  } else {
    path = str;
    argv = null;
  }

  if (path.substr(0, 2) == './') {
    /** @type {string} */
    var pwd = this.executeContext.getEnv('$PWD',
        this.executeContext.fileSystemManager.defaultFileSystem.rootPath.spec);
    path = pwd + '/' + path.substr(2);
  }

  return [path, argv];
};

/**
 * Run the given path with the given argv string, returning a promise that
 * resolves to the result of the evaluation.
 *
 * For relative paths we'll search the builtins as well as $PATH.  The argv
 * string will be parsed according to the sigil of the target executable.
 *
 * @param {string} pathSpec
 * @param {string} argv
 * @return {!Promise<*>}
 */
Wash.prototype.dispatch = function(pathSpec, argv) {
  var path = this.builtinsFS.rootPath.combine(pathSpec);
  return this.builtinsFS.stat(path).then(
    function(/** StatResult */ statResult) {
      var arg = this.parseArgv(statResult.signature, argv);
      return this.builtinsFS.createExecuteContext(
          path, this.executeContext.stdio, arg).then(
        function(/** ExecuteContext */ cx) {
          return this.dispatchExecuteContext(cx);
        }.bind(this));
    }.bind(this)
  ).catch(
    function(error) {
      if (!AxiomError.NotFound.test(error))
        return error;

      return this.findExecutable(pathSpec).then(
        function(/** {path: !Path, statResult: StatResult } */ result) {
          var arg = this.parseArgv(result.statResult.signature, argv);
          return this.fileSystemManager.createExecuteContext(
              result.path, this.executeContext.stdio, arg).then(
            function(cx) {
              return this.dispatchExecuteContext(cx);
            }.bind(this));
        }.bind(this));
    }.bind(this)
  );
};

/**
 * @param {ExecuteContext} cx
 * @return {Promise<*>}
 */
Wash.prototype.dispatchExecuteContext = function(cx) {
  this.executeContext.setCallee(cx);
  return cx.execute();
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

/**
 * @param {!Signal} signal
 * @return {void}
 */
Wash.prototype.onSignal_ = function(signal) {
  console.log('Caught signal: ' + signal.name);
  this.executeContext.dispatchSignal(signal);
};
