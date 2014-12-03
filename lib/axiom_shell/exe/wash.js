// Copyright (c) 2013 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import JsFileSystem from 'axiom/fs/js_file_system';
import JsEntry from 'axiom/fs/js_entry';
import Path from 'axiom/fs/path';

import Termcap from 'axiom_shell/util/termcap';
import WashBuiltins from 'axiom_shell/exe/wash_builtins';
import environment from 'axiom_shell/environment';

/**
 * The shell read-eval-print loop.
 */
export var Shell = function(executeContext) {
  this.executeContext = executeContext;
  executeContext.onSignal.addListener(this.onSignal_.bind(this));

  this.fileSystem = environment.getServiceBinding('filesystems@axiom');

  if (!this.executeContext.getEnv('$PWD'))
    this.executeContext.setEnv('$PWD', '/');

  this.inputHistory = [];

  // The list of currently active jobs.
  this.executeContextList_ = [];

  // The job in the foreground (receives keyboard input).
  this.foregroundContext_ = null;

  this.tc_ = new Termcap();
  this.promptString_ = this.tc_.output(
      '%set-attr(FG_BOLD, FG_CYAN)wash$ %set-attr()');

  this.builtins = new WashBuiltins(this);
  this.builtinsFS = new JsFileSystem();
  this.builtinsFS.rootDirectory.install(this.builtins.callbacks);
};

/**
 * The main entrypoint when invoked as a JsExecutable.
 */
Shell.main = function(executeContext) {
  var shell = new Shell(executeContext);
  window.wash_ = shell;  // Console debugging aid.
  executeContext.ready();

  return shell.readEvalPrintLoop();
};

export default Shell.main;

Shell.prototype.absPath = function(path) {
  return Path.abs(this.executeContext.getEnv('$PWD', '/'), path);
};

Shell.prototype.findExecutable = function(path) {
  var searchList;

  var envPath = this.executeContext.getEnv('@PATH', []);
  if (path.substr(0, 1) == '/') {
    searchList = [path];
  } else {
    searchList = envPath.map(function(p) { return p + '/' + path });
  }

  var searchNextPath = function() {
    if (!searchList.length)
      return Promise.reject(new AxiomError.NotFound('path', path));

    var currentPath = searchList.shift();
    return this.fileSystem.stat(currentPath).then(
      function(result) {
        if (result.mode & Path.mode.x)
          return currentPath;

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

Shell.prototype.read = function() {
  return this.findExecutable('readline').then(
    function(readlinePath) {
      return this.executeContext.callPromise(
          this.fileSystem,
          readlinePath,
          { promptString: this.promptString_,
            inputHistory: this.inputHistory
          });
    }.bind(this)
  );
};

/**
 * Parse and evaluate a line of shell input.
 */
Shell.prototype.evaluate = function(value) {
  var str = value.trim();

  if (!str)
    return Promise.resolve();

  if (str != this.inputHistory[0])
    this.inputHistory.unshift(str);

  var ary = this.parseShellInput(str);
  return this.dispatch(ary[0], ary[1]);
};

Shell.prototype.readEvalPrint = function() {
  return this.read().then(
    function(result) {
      if (result == null) {
        // EOF from readline.
        return Promise.resolve(null);
      }

      if (typeof result != 'string') {
        return Promise.reject(new AxiomError.Runtime(
            'Unexpected type from readline: ' + (typeof value)));
      }

      return this.evaluate(result).then(
        function(value) {
          if (typeof value != 'undefined' && typeof value != 'number' &&
              value != null) {
            this.println(JSON.stringify(value));
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
 */
Shell.prototype.readEvalPrintLoop = function() {
  return this.readEvalPrint().then(
    function(value) {
      if (this.executeContext.isReadyState('READY'))
        return this.readEvalPrintLoop();

      return Promise.resolve(value);
    }.bind(this)
  ).catch(
    function(value) {
      if (this.executeContext.isReadyState('READY'))
        return this.readEvalPrintLoop();

      return Promise.reject(value);
    }.bind(this)
  );
};

Shell.prototype.parseShellInput = function(str) {
  var pos = str.indexOf(' ');
  var path, argv;
  if (pos > -1) {
    path = str.substr(0, pos);
    argv = this.parseArgv(str.substr(pos + 1).trim());
  } else {
    path = str;
    argv = null;
  }

  if (path.substr(0, 2) == './')
    path = this.executeContext.getEnv('$PWD', '/') + path.substr(2);

  return [path, argv];
};

Shell.prototype.dispatch = function(path, argv) {
  if (this.builtins.callbacks.hasOwnProperty(path)) {
    return this.builtinsFS.binding.createContext('execute', path, argv).then(
      function(cx) {
        return this.dispatchExecuteContext(cx);
      }.bind(this));
  }

  return this.findExecutable(path).then(
    function(abspath) {
      return this.fileSystem.createContext(
          'execute', abspath, argv).then(
         function(cx) {
           return this.dispatchExecuteContext(cx);
         }.bind(this));
    }.bind(this)
  );
};

Shell.prototype.dispatchExecuteContext = function(cx) {
  this.executeContext.setCallee(cx);
  return cx.executePromise();
};

Shell.prototype.parseArgv = function(argv) {
  if (!argv)
    return null;

  if (/[\{\[\"\']/.test(argv.substr(0, 1))) {
    // argv starts with {, [, ", or '... parse it as JSON.
    try {
      return JSON.parse(argv);
    } catch (ex) {
      throw AxiomError.Runtime('Error parsing arguments: ' + ex);
    }

  } else {
    return argv.split(/\s+/g);
  }
};

Shell.prototype.printErrorValue = function(value) {
  var args = [];
  if (!(value instanceof AxiomError)) {
    if (value instanceof Error) {
      console.log('printErrorValue:',value);
      value = new AxiomError.Runtime(value.message);
    } else if (value instanceof Object) {
      value = new AxiomError.Runtime(value.toString());
    } else {
      value = new AxiomError.Runtime(JSON.stringify(value));
    }
  }

  for (var key in value.errorValue) {
    args.push(key + ': ' + JSON.stringify(value.errorValue[key]));
  }

  var str = this.tc_.output('%set-attr(FG_BOLD, FG_RED)' + value.errorName +
                            '%set-attr()');
  if (args.length)
    str += ': ' + args.join(', ');

  this.errorln(str);
};

Shell.prototype.println = function(str) {
  this.executeContext.stdout(str + '\n');
};

Shell.prototype.errorln = function(str) {
  this.executeContext.stderr(str + '\n');
};

Shell.prototype.onSignal_ = function(name) {
  console.log('Caught signal: ' + name);
  if (name == 'interrupt')
    this.readEvalPrintLoop();
};
