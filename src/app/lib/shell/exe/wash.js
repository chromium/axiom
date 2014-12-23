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

import JsFileSystem from 'axiom/fs/js_file_system';
import JsEntry from 'axiom/fs/js_entry';
import Path from 'axiom/fs/path';
import domfsUtil from 'axiom/fs/domfs_util';

import minimist from 'minimist';
import Termcap from 'shell/util/termcap';
import WashBuiltins from 'shell/exe/wash_builtins';
import environment from 'shell/environment';

/**
 * The shell read-eval-print loop.
 */
export var Shell = function(executeContext) {
  this.executeContext = executeContext;
  executeContext.onSignal.addListener(this.onSignal_.bind(this));

  this.fileSystem = environment.getServiceBinding('filesystems@axiom');

  if (!this.executeContext.getEnv('$PWD'))
    this.executeContext.setEnv('$PWD', '/');

  this.historyFile = executeContext.getEnv(
      '$HISTFILE', '/mnt/html5/home/.wash_history');
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

  return shell.fileSystem.readFile(
      shell.historyFile, {read: true}, {dataType: 'utf8-string'}).then(
    function(data) {
      var history = JSON.parse(data.data);
      if (history instanceof Array)
        shell.inputHistory = history;

      return shell.readEvalPrintLoop();
    }
  ).catch(
    function(err) {
      console.log(err);
      return shell.readEvalPrintLoop();
    }
  );
};

export default Shell.main;

Shell.prototype.absPath = function(path) {
  return Path.abs(this.executeContext.getEnv('$PWD', '/'), path);
};

Shell.prototype.findExecutable = function(path) {
  var searchList;

  var searchNextPath = function() {
    if (!searchList.length)
      return Promise.reject(new AxiomError.NotFound('path', path));

    var currentPath = searchList.shift();
    return this.fileSystem.stat(currentPath).then(
      function(statResult) {
        if (statResult.mode & Path.mode.x)
          return {absPath: currentPath, stat: statResult};

        return searchNextPath();
      }
    ).catch(function(value) {
      if (AxiomError.NotFound.test(value))
        return searchNextPath();

      return Promise.reject(value);
    });
  }.bind(this);

  return this.findExecInPath('/addon').then((function(result) {
    var envPath = this.executeContext.getEnv('@PATH', []);
    if (path.substr(0, 1) == '/') {
      searchList = [path];
    } else {
      searchList = envPath.map(function(p) { return p + '/' + path });
    }

   for (var i in result) {
     if (envPath.indexOf(result[i]) == -1) {
       envPath.push(result[i]);
     }
   }

   // Set the new path with added new executables path.
   this.executeContext.setEnv('@PATH', envPath);
    return searchNextPath();
  }.bind(this)));
};

Shell.prototype.read = function() {
  return this.findExecutable('readline').then(
    function(result) {
      return this.executeContext.callPromise(
          this.fileSystem,
          result.absPath,
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
      if (result == null || result == 'exit') {
        if (!result)
          this.executeContext.stdout('exit\n');
        return this.exit();
      }

      if (typeof result != 'string') {
        return Promise.reject(new AxiomError.Runtime(
            'Unexpected type from readline: ' + (typeof value)));
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
 * Looks into path/* /exe to find executables.
 * @returns a promise with list of executable paths.
 */
Shell.prototype.findExecInPath = function(path) {
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

Shell.prototype.dispatch = function(path, argv) {
  return this.builtinsFS.stat(path).then(
    function(statResult) {
      argv = this.parseArgv(statResult.argSigil, argv);
      return this.builtinsFS.binding.createContext('execute', path, argv).then(
        function(cx) {
          return this.dispatchExecuteContext(cx);
        }.bind(this));
    }.bind(this)
  ).catch(
    function(error) {
      if (!AxiomError.NotFound.test(error))
        return error;

      return this.findExecutable(path).then(
        function(result) {
          argv = this.parseArgv(result.stat.argSigil, argv);
          return this.fileSystem.createContext(
              'execute', result.absPath, argv).then(
            function(cx) {
              return this.dispatchExecuteContext(cx);
            }.bind(this));
        }.bind(this));
    }.bind(this)
  );
};

Shell.prototype.dispatchExecuteContext = function(cx) {
  this.executeContext.setCallee(cx);
  return cx.executePromise();
};

Shell.prototype.parseArgv = function(argSigil, argv) {
  if (!argv)
    argv = '';

  if (/[\{\[\"\']/.test(argv.substr(0, 1))) {
    // argv starts with {, [, ", or '... parse it as JSON.
    try {
      return JSON.parse(argv);
    } catch (ex) {
      throw AxiomError.Runtime('Error parsing arguments: ' + ex);
    }

  } else {
    if (argSigil == '$' || argSigil == '*')
      return argv;

    if (argSigil == '@')
      return argv ? argv.split(/\s+/g) : [];

    if (argSigil == '%')
      return minimist(argv.split(/\s+/g), {});
  }
};

Shell.prototype.printErrorValue = function(value) {
  var args = [];
  if (!(value instanceof AxiomError)) {
    if (value instanceof Error) {
      console.log('printErrorValue:', value);
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

  var str = this.tc_.output('%set-attr(FG_BOLD, FG_RED)Error%set-attr(): ' +
                            value.errorName);
  if (args.length)
    str += ' {' + args.join(', ') + '}';

  this.errorln(str);
};

Shell.prototype.exit = function() {
  return this.fileSystem.writeFile(
      this.historyFile,
      { create: true, truncate: true, write: true },
      { dataType: 'utf8-string',
        data: JSON.stringify(this.inputHistory)
      }
  ).then(
      function() {
        console.log('closed');
        this.executeContext.closeOk(null);
      }.bind(this)
  ).catch(
    function(error) {
      // TODO: writeFile should only raise AxiomErrors.
      if (error instanceof window.FileError)
        error = domfsUtil.convertFileError(this.historyFile, error);

      this.printErrorValue(error);
      this.executeContext.closeOk(null);
    }.bind(this)
  );
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
