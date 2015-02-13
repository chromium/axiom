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

import DataType from 'axiom/fs/data_type';
import OpenContext from 'axiom/fs/base/open_context';
import Path from 'axiom/fs/path';

import JsFileSystem from 'axiom/fs/js/file_system';
import JsEntry from 'axiom/fs/js/entry';
//TODO: import domfsUtil from 'axiom/fs/dom/domfs_util';

import Termcap from 'wash/termcap';

/** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
var ExecuteContext;

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef ReadResult$$module$axiom$fs$read_result */
var ReadResult;

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

  /** @type {JsFileSystem} */
  this.fileSystem = executeContext.jsfs;

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
  this.promptString_ = this.tc_.output(
      '%set-attr(FG_BOLD, FG_CYAN)wash$ %set-attr()');

  executeContext.onSignal.addListener(this.onSignal_.bind(this));

  var builtins = new Wash.Builtins(this);
  this.builtinsFS = new JsFileSystem();
  this.builtinsFS.rootDirectory.install(builtins.callbacks);

  if (!this.executeContext.getEnv('$PWD'))
    this.executeContext.setEnv('$PWD', '/');

  if (!this.executeContext.getEnv('$HOME'))
    this.executeContext.setEnv('$HOME', '/home');
};

/**
 * Set to true to make the shell exit if a subcommand errors.
 *
 * This can help debug infinite-loop at startup issues.
 *
 * @type {boolean}
 */
Wash.exitOnError = true;

/**
 * @constructor
 *
 * Shell builtins.  These can't be done as separate executables because they
 * alter state of the controlling Wash instance or have privileged access to it.
 *
 * @param {Wash} wash
 */
Wash.Builtins = function(wash) {
  /** @type {Object<string, function(JsExecuteContext): Promise<*>>} */
  this.callbacks = {
    /**
     * @param {JsExecuteContext} cx
     */
    'cd($)': function(cx) {
      cx.ready();

      if (typeof cx.arg != 'string')
        return cx.closeError(new AxiomError.TypeMismatch('string', cx.arg));

      /** @type {string} */
      var path = wash.absPath(cx.arg || '');

      return wash.fileSystem.stat(path).then(
        function(/** StatResult */ statResult) {
          if (!(statResult.mode & Path.Mode.D))
            return Promise.reject(new AxiomError.TypeMismatch('dir', path));

          if (!/\/$/.test(path))
            path += '/';

          wash.executeContext.setEnv('$PWD', path);
          return Promise.resolve(null);
        }
      );
    },

    /**
     * @param {JsExecuteContext} cx
     */
    'env-del(@)': function(cx) {
      cx.ready();

      var arg = cx.arg;
      for (var i = 0; i < arg.length; i++) {
        wash.executeContext.delEnv(arg[i]);
      }

      return Promise.resolve(null);
    },

    /**
     * @param {JsExecuteContext} cx
     */
    'env-get(@)': function(cx) {
      cx.ready();

      var arg = cx.arg;
      if (!arg.length)
        return Promise.resolve(wash.executeContext.getEnvs());

      var rv = {};
      for (var i = 0; i < arg.length; i++) {
        rv[arg[i]] = wash.executeContext.getEnv(arg[i]);
      }

      return Promise.resolve(rv);
    },

    /**
     * @param {JsExecuteContext} cx
     */
    'env-set(%)': function(cx) {
      cx.ready();

      var arg = cx.arg;
      for (var name in arg) {
        var value = arg[name];
        var sigil = name.substr(0, 1);
        if ('$@%'.indexOf(sigil) == -1)
          return Promise.reject(new AxiomError.Invalid('name', name));

        if (!((sigil == '$' && typeof value == 'string') ||
              (sigil == '@' && value instanceof Array) ||
              (sigil == '%' && value instanceof Object))) {
          return Promise.reject(new AxiomError.TypeMismatch(sigil, value));
        }

        wash.executeContext.setEnv(name, value);
      }

      return Promise.resolve(null);
    }
  };
};

/**
 * The main entrypoint when invoked as a JsExecutable.
 *
 * @param {JsExecuteContext} cx
 * @return {!Promise<*>}
 */
export default Wash.main = function(cx) {
  var wash = new Wash(cx);

  if (typeof window != 'undefined')
    window.wash_ = wash;  // Console debugging aid.

  cx.ready();

  var repl = wash.readEvalPrintLoop.bind(wash);
  wash.loadWashHistory().then(repl).catch(repl);
  return cx.ephemeralPromise;
};

/** @type {string} */
Wash.main.argSigil = '%';

/**
 * @return {!Promise<null>}
 */
Wash.prototype.loadWashHistory = function() {
  if (!this.historyFile)
    return Promise.resolve(null);

  return this.fileSystem.readFile(
      this.historyFile, DataType.UTF8String).then(
    function(/** ReadResult */ result) {
      try {
        if (typeof result.data != 'string') {
          return Promise.reject(new AxiomError.TypeMismatch(
              'string', typeof result.data));
        }
        var history = JSON.parse(result.data);
        if (history instanceof Array)
          this.inputHistory = history;
      } catch (ex) {
        this.errorln('Error loading: ' + this.historyFile);
        this.printErrorValue(ex);
      }

      return Promise.resolve(null);
    }.bind(this)
  ).catch(
    function(err) {
      if (!AxiomError.NotFound.test(err))
        this.printErrorValue(err);

      return Promise.reject(err);
    }.bind(this)
  );
};

/**
 * @param {string} path
 * @return {string}
 */
Wash.prototype.absPath = function(path) {
  return Path.abs(this.executeContext.getEnv('$PWD', '/'), path);
};

/**
 * @param {string} path
 * @return {!Promise<!{absPath: string, statResult: StatResult}>}
 */
Wash.prototype.findExecutable = function(path) {
  var searchList = this.executeContext.getEnv('@PATH', ['/']);

  var searchNextPath = function() {
    if (!searchList.length)
      return Promise.reject(new AxiomError.NotFound('path', path));

    var currentPrefix = searchList.shift();
    var currentPath = currentPrefix + '/' + path;
    return this.fileSystem.stat(currentPath).then(
      function(statResult) {
        if (statResult.mode & Path.Mode.X)
          return Promise.resolve({absPath: currentPath,
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
          this.fileSystem,
          result.absPath,
          { promptString: this.promptString_,
            inputHistory: this.inputHistory
          });
    }.bind(this)
  );
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
  return this.dispatch(ary[0], ary[1]);
};

/**
 * Read a single line of input, eval it, print the result or an error.
 *
 * @return {Promise<*>} Resolves to result of the evaluation.
 */
Wash.prototype.readEvalPrint = function() {
  return this.read().then(
    function(result) {
      if (result == null || result == 'exit') {
        if (!result)
          this.executeContext.stdout('exit\n');
        return this.exit();
      }

      if (typeof result != 'string') {
        return Promise.reject(new AxiomError.Runtime(
            'Unexpected type from readline: ' + (typeof result)));
      }

      return this.evaluate(result).then(
        function(value) {
          if (typeof value != 'undefined' && typeof value != 'number' &&
              value != null) {
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

  if (path.substr(0, 2) == './')
    path = this.executeContext.getEnv('$PWD', '/') + path.substr(2);

  return [path, argv];
};


/**
 * Looks into path/([^/])* /exe to find executables.
 * returns a promise with list of executable paths.
 *
 * @param {string} path
 * @return {!Promise<!Array<string>>}
 */
Wash.prototype.findExeDirs = function(path) {
  return new Promise(function(resolve, reject) {
    var execs = [];
    this.fileSystem.list(path).then(function(result) {
      var promises = [];
      var names = Object.keys(result);
      names.forEach(function(name) {
        promises.push(this.fileSystem.list(path + '/' + name).then(function(r) {
          if (r && r['exe']) {
            execs.push(path + '/' + name + '/' + 'exe' + '/');
          }
        }));
      }.bind(this));
      Promise.all(promises).then(function() {
        resolve(execs);
      });
    }.bind(this));
  }.bind(this));
};

/**
 * Run the given path with the given argv string, returning a promise that
 * resolves to the result of the evaluation.
 *
 * For relative paths we'll search the builtins as well as $PATH.  The argv
 * string will be parsed according to the sigil of the target executable.
 *
 * @param {string} path
 * @param {string} argv
 */
Wash.prototype.dispatch = function(path, argv) {
  return this.builtinsFS.stat(path).then(
    function(/** StatResult */ statResult) {
      argv = this.parseArgv(statResult.argSigil, argv);
      return this.builtinsFS.createExecuteContext(path, argv).then(
        function(/** ExecuteContext */ cx) {
          return this.dispatchExecuteContext(cx);
        }.bind(this));
    }.bind(this)
  ).catch(
    function(error) {
      if (!AxiomError.NotFound.test(error))
        return error;

      return this.findExecutable(path).then(
        function(/** {absPath: string, statResult: StatResult } */ result) {
          argv = this.parseArgv(result.stat.argSigil, argv);
          return this.fileSystem.createExecuteContext(
              result.absPath, argv).then(
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

Wash.prototype.parseArgv = function(argSigil, argv) {
  if (!argv)
    argv = '';

  if (/[\{\[\"\']/.test(argv.substr(0, 1))) {
    // argv starts with {, [, ", or '... parse it as JSON.
    try {
      return JSON.parse(argv);
    } catch (ex) {
      throw new AxiomError.Runtime('Error parsing arguments: ' + ex);
    }

  } else {
    if (argSigil == '$' || argSigil == '*')
      return argv;

    if (argSigil == '@')
      return argv ? argv.split(/\s+/g) : [];

    if (argSigil == '%') {
      throw new AxiomError.Runtime('TODO: fix minimist support');
      //return minimist(argv.split(/\s+/g), {});
    }
  }
};

Wash.prototype.printErrorValue = function(value) {
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

  if (value.stack)
    str += '\n' + value.stack;

  this.errorln(str);
};

Wash.prototype.exit = function() {
  if (!this.historyFile)
    return this.executeContext.closeOk(null);

  return this.fileSystem.writeFile(
      this.historyFile,
      { create: true, truncate: true },
      { dataType: 'utf8-string',
            data: JSON.stringify(this.inputHistory, null, '  ') + '\n'
      }
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

Wash.prototype.println = function(str) {
  this.executeContext.stdout(str + '\n');
};

Wash.prototype.errorln = function(str) {
  this.executeContext.stderr(str + '\n');
};

Wash.prototype.onSignal_ = function(name) {
  console.log('Caught signal: ' + name);
  if (name == 'interrupt')
    this.readEvalPrintLoop();
};
