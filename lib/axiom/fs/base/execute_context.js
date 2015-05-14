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
import AxiomEvent from 'axiom/core/event';
import Ephemeral from 'axiom/core/ephemeral';
import Stdio from 'axiom/fs/stdio';
import NestedStdio from 'axiom/fs/nested_stdio';

import Arguments from 'axiom/fs/arguments';
import Path from 'axiom/fs/path';
import TTYState from 'axiom/fs/tty_state';

/** @typedef FileSystem$$module$axiom$fs$base$file_system */
var FileSystem;

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/** @typedef OpenContext$$module$axiom$fs$base$open_context */
var OpenContext;

/** @typedef OpenMode$$module$axiom$fs$open_mode */
var OpenMode;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef {{name: string, value: *}} */
var Signal;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * @constructor @extends {Ephemeral<*>}
 *
 * An Ephemeral that represents a running executable on a FileSystem.
 *
 * You should only create an ExecuteContext by calling an instance of
 * FileSystem..createExecuteContext(...).
 *
 * @param {!FileSystem} fileSystem The parent file system.
 * @param {!Stdio} stdio
 * @param {Path} path
 * @param {Arguments} args
 */
export var ExecuteContext = function(fileSystem, stdio, path, args) {
  Ephemeral.call(this);

  if (!args || !(args instanceof Arguments))
    throw new AxiomError.Missing('arguments');

  /**
   * @type {!FileSystem} Parent file system.
   */
  this.fileSystem = fileSystem;

  /**
   * @type {!FileSystemManager} Parent file system.
   */
  this.fileSystemManager = fileSystem.fileSystemManager;

  /**
   * @type {Path} The path we're supposed to execute.
   */
  this.path = path;

  /**
   * @type {Arguments} The argument to pass to the executable.
   */
  this.args = args;

  // If the parent file system is closed, we close too.
  this.dependsOn(this.fileSystem);

  /**
   * The ExecuteContexts we're currently calling out to, if any.
   *
   * See addCallee_().
   *
   * @type {!Array<!ExecuteContext>}
   */
  this.callees = [];

  // TODO(ussuri): Turn these into getters.
  /** @type {!ReadableStream} */
  this.stdin = stdio.stdin;
  /** @type {!WritableStream} */
  this.stdout = stdio.stdout;
  /** @type {!WritableStream} */
  this.stderr = stdio.stderr;
  /** @type {!ReadableStream} */
  this.signal = stdio.signal;
  /** @type {!ReadableStream} */
  this.ttyin = stdio.ttyin;
  /** @type {!WritableStream} */
  this.ttyout = stdio.ttyout;

  /** @type {!Stdio} */
  this.setStdio(stdio);

  /** @type {!AxiomEvent} */
  this.onTTYRequest = new AxiomEvent();

  /**
   * The environtment variables for this execute context.
   * @private @type {Object<string, *>}
   */
  this.env_ = {};

  /**
   * The tty state for this execute context.
   * @private @type {!TTYState}
   */
  this.tty_ = new TTYState();
};

export default ExecuteContext;

ExecuteContext.prototype = Object.create(Ephemeral.prototype);

/**
 * @param {string} name
 * @param {*=} opt_defaultValue
 * @return {?}
 */
ExecuteContext.prototype.getArg = function (name, opt_defaultValue) {
  return this.args.getValue(name, opt_defaultValue);
};

/**
 * @return {string}
 */
ExecuteContext.prototype.getPwd = function() {
  return this.getEnv('$PWD',
                     this.fileSystemManager.defaultFileSystem.rootPath.spec);
};

/**
 * Initiate the execute.
 *
 * Returns a promise that completes when the execution is complete.
 *
 * @return {!Promise<*>}
 */
ExecuteContext.prototype.execute = function() {
  this.assertEphemeral('Wait');
  return this.ephemeralPromise;
};

/**
 * Set the given ExecuteContext as the callee for this instance.
 *
 * When calling another executable, incoming calls and outbound events are
 * wired up to the caller as appropriate.  This instance will not receive
 * the stdio-like events while a call is in progress.  The onSignal event,
 * however, is delivered to this instance even when a call is in progress.
 *
 * If the callee is closed, events are rerouted back to this instance and the
 * callee instance property is set to null.
 *
 * @param {!ExecuteContext} executeContext
 * @return {void}
 */
ExecuteContext.prototype.addCallee_ = function(callee) {
  var previousInterruptChar = this.tty_.getInterrupt();

  var onClose = function(reason, value) {
    callee.onTTYRequest.removeListener(this.onTTYRequest.fire);

    // Remove the callee from the list of active callees.
    this.callees.splice(this.callees.indexOf(callee), 1);

    if (this.tty_.getInterrupt() != previousInterruptChar)
      this.requestTTY({interrupt: previousInterruptChar});
  }.bind(this);

  callee.onClose.listenOnce(onClose);
  callee.onTTYRequest.addListener(this.onTTYRequest.fire);
  callee.setEnvs(this.env_);
  callee.setTTY_(this.tty_);

  this.callees.push(callee);
};

/**
 * @param {!Stdio} stdio
 * @return {void}
 */
ExecuteContext.prototype.setStdio = function(stdio) {
  if (this.stdio)
    this.stdio.signal.onData.removeListener(this.dispatchSignal_, this);

  this.stdio = stdio;
  this.stdin = stdio.stdin;
  this.stdout = stdio.stdout;
  this.stderr = stdio.stderr;
  this.signal = stdio.signal;
  this.ttyin = stdio.ttyin;
  this.ttyout = stdio.ttyout;

  this.stdio.signal.onData.addListener(this.dispatchSignal_, this);
};

/**
 * Utility method to construct a new ExecuteContext, set it as the callee, and
 * execute it with the given path and arg.
 *
 * @param {!Path} path
 * @param {?Object} arg
 * @param {Stdio=} opt_stdio
 * @param {function(string, *)=} opt_onClose
 * @param {?FileSystem=} opt_fileSystem
 * @return {!Promise<*>}
 */
ExecuteContext.prototype.call = function(
    path, arg, opt_stdio, opt_onClose, opt_fileSystem) {
  var stdio = new NestedStdio(opt_stdio || this.stdio);
  var fileSystem = opt_fileSystem || this.fileSystemManager;

  return this.createExecuteContext(path, stdio, arg, fileSystem).then(
    function(cx) {
      cx.onClose.listenOnce(function(reason, value) {
        if (opt_onClose) {
          opt_onClose(reason, value);
        }
        if (reason === 'ok') {
          stdio.end();
        } else {
          stdio.close(value);
        }
      }.bind(this));
      this.addCallee_(cx);
      return cx.execute();
    }.bind(this));
};

/**
 * Return a copy of the internal tty state.
 * @return {TTYState}
 */
ExecuteContext.prototype.getTTY = function() {
  return this.tty_.clone();
};

/**
 * Set the authoritative state of the tty.
 *
 * This should only be invoked in the direction of tty->executable.  Calls in
 * the reverse direction will only affect this instance and those derived (via
 * addCallee_) from it, and will be overwritten the next time the authoritative
 * state changes.
 *
 * Executables should use requestTTY to request changes to the authoritative
 * state.
 *
 * @private
 * @param {TTYState|Object} tty
 * @return {void}
 */
ExecuteContext.prototype.setTTY_ = function(tty) {
  this.assertEphemeral('Wait', 'Ready');

  this.tty_.copyFrom(tty);

  this.callees.forEach(function(callee) {
    callee.setTTY_(tty);
  });
};

/**
 * @private
 *
 * Return a by-value copy of the given value.
 *
 * @param {*} v
 * @return {*}
 */
ExecuteContext.prototype.copyValue_ = function(v) {
  if (v instanceof Object)
    return JSON.parse(JSON.stringify(v));

  return v;
};

/**
 * Request a change to the controlling tty.
 *
 * At the moment only the 'interrupt' property can be changed.
 *
 * @param {Object} tty An object containing a changeable property of the
 *   tty.
 * @return {void}
 */
ExecuteContext.prototype.requestTTY = function(tty) {
  this.assertEphemeral('Ready');

  if (typeof tty.interrupt == 'string')
    this.onTTYRequest.fire({interrupt: tty.interrupt});
};

/**
 * Get a copy of the current environment variables.
 *
 * @return {*}
 */
ExecuteContext.prototype.getEnvs = function() {
  return this.copyValue_(this.env_);
};

/**
 * Get the value of the given environment variable, or the provided
 * defaultValue if it is not set.
 *
 * @param {string} name
 * @param {*=} opt_defaultValue
 * return {*}
 */
ExecuteContext.prototype.getEnv = function(name, opt_defaultValue) {
  if (this.env_.hasOwnProperty(name))
    return this.copyValue_(this.env_[name]);

  return opt_defaultValue;
};

/**
 * Overwrite the current environment.
 *
 * @param {Object} env
 * @return {void}
 */
ExecuteContext.prototype.setEnvs = function(env) {
  this.assertEphemeral('Wait', 'Ready');
  for (var key in env) {
    this.setEnv(key, this.copyValue_(env[key]));
  }
};

/**
 * Set the given environment variable.
 *
 * @param {string} name
 * @param {*} value
 * @return {void}
 */
ExecuteContext.prototype.setEnv = function(name, value) {
  this.assertEphemeral('Wait', 'Ready');
  this.env_[name] = this.copyValue_(value);
};

/**
 * Remove the given environment variable.
 *
 * @param {string} name
 * @return {void}
 */
ExecuteContext.prototype.delEnv = function(name) {
  this.assertEphemeral('Wait', 'Ready');
  delete this.env_[name];
};

/**
 * Create a new execute context using the fs.FileSystem for this execute
 * context, bound to the lifetime of this context.
 *
 * @param {!Path} path
 * @param {!Stdio} stdio
 * @param {Object} arg
 * @param {!FileSystem} fileSystem
 * @return {Promise<ExecuteContext>}
 */
ExecuteContext.prototype.createExecuteContext = function(
    path, stdio, arg, fileSystem) {
  return fileSystem.createExecuteContext(path, stdio, arg).then(
    function(cx) {
      cx.dependsOn(this);
      return cx;
    }.bind(this));
};

/**
 * Create a new open context using the fs.FileSystem for this execute
 * context, bound to the lifetime of this context.
 *
 * @param {Path} path
 * @param {OpenMode} mode
 * @return {Promise<OpenContext>}
 */
ExecuteContext.prototype.createOpenContext = function(path, mode) {
  return this.fileSystemManager.createOpenContext(path, mode).then(
    function(cx) {
      cx.dependsOn(this);
      return cx;
    }.bind(this));
};

/**
 * Dispatch a signal to this execution context and callee.
 *
 * @private
 * @param {!Signal} signal
 * @return {void}
 */
ExecuteContext.prototype.dispatchSignal_ = function(signal) {
  if (signal.name === 'tty-change') {
    this.setTTY_(/** @type {Object} */(signal.value));
    return;
  }

  if (signal.name === 'interrupt') {
    // Interrupt goes to the deepest callee
    if (this.callees.length) {
      this.callees.forEach(function(callee) {
        callee.dispatchSignal_(signal);
      });
      return;
    }

    // We might be closed already (e.g. during multiple i/o redirection through
    // pipes).
    if (!this.isEphemeral(Ephemeral.State.Closed)) {
      this.closeError(new AxiomError.Interrupt());
    }
  }
};
