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

/**
 * @constructor @extends {Ephemeral<*>}
 *
 * An Ephemeral that represents a running executable on a FileSystem.
 *
 * You should only create an ExecuteContext by calling an instance of
 * FileSystem..createExecuteContext(...).
 *
 * @param {!FileSystem} fileSystem The parent file system.
 * @param {Path} path
 * @param {Arguments} args
 */
export var ExecuteContext = function(fileSystem, path, args) {
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
   * @type {*} The argument to pass to the executable.
   */
  this.args = args;

  // If the parent file system is closed, we close too.
  this.dependsOn(this.fileSystem);

  /**
   * The ExecuteContext we're currently calling out to, if any.
   *
   * See setCallee().
   *
   * @type {ExecuteContext}
   */
  this.callee = null;

  /** @type {!AxiomEvent} */
  this.onSignal = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onStdOut = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onStdErr = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onStdIn = new AxiomEvent();
  /** @type {!AxiomEvent} */
  this.onTTYChange = new AxiomEvent();
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
 * @param {ExecuteContext} executeContext
 * @return {void}
 */
ExecuteContext.prototype.setCallee = function(executeContext) {
  if (this.callee)
    throw new AxiomError.Runtime('Call in progress');

  this.callee = executeContext;
  var previousInterruptChar = this.tty_.getInterrupt();

  var onClose = function() {
    this.callee.onStdOut.removeListener(this.onStdOut.fire);
    this.callee.onStdOut.removeListener(this.onStdErr.fire);
    this.callee.onTTYRequest.removeListener(this.onTTYRequest.fire);
    this.callee = null;

    if (this.tty_.getInterrupt() != previousInterruptChar)
      this.requestTTY({interrupt: previousInterruptChar});
  }.bind(this);

  this.callee.onClose.listenOnce(onClose);
  this.callee.onStdOut.addListener(this.onStdOut.fire);
  this.callee.onStdErr.addListener(this.onStdErr.fire);
  this.callee.onTTYRequest.addListener(this.onTTYRequest.fire);
  this.callee.setEnvs(this.env_);
  this.callee.setTTY(this.tty_);
};

/**
 * Utility method to construct a new ExecuteContext, set it as the callee, and
 * execute it with the given path and arg.
 *
 * @param {!FileSystemManager} fileSystemManager
 * @param {!Path} path
 * @param {Object} arg
 * @return {Promise<*>}
 */
ExecuteContext.prototype.call = function(fileSystemManager, path, arg) {
  return fileSystemManager.createExecuteContext(path, arg).then(
    function(cx) {
      this.setCallee(cx);
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
 * setCallee) from it, and will be overwritten the next time the authoritative
 * state changes.
 *
 * Executables should use requestTTY to request changes to the authoritative
 * state.
 *
 * @param {TTYState} tty
 * @return {void}
 */
ExecuteContext.prototype.setTTY = function(tty) {
  this.assertEphemeral('Wait', 'Ready');

  this.tty_.copyFrom(tty);
  this.onTTYChange.fire(this.tty_);

  if (this.callee)
    this.callee.setTTY(tty);
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
 * @param {Object} arg
 * @return {Promise<ExecuteContext>}
 */
ExecuteContext.prototype.createExecuteContext = function(path, arg) {
  return this.fileSystemManager.createExecuteContext(path, arg).then(
    function(cx) {
      cx.dependsOn(this);
      return cx;
    });
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
    });
};

/**
 * Send a signal to the running executable.
 *
 * The only signal defined at this time has the name 'interrupt' and a null
 * value.
 *
 * @param {string} name
 * @param {string} value
 * @return {void}
 */
ExecuteContext.prototype.signal = function(name, value) {
  this.assertReady();
  if (this.callee) {
    this.callee.closeError(new AxiomError.Interrupt());
  } else {
    this.onSignal.fire(name, value);
  }
};

/**
 * Send stdout from this executable.
 *
 * This is not restricted to string values.  Recipients should filter out
 * non-string values in their onStdOut handler if necessary.
 *
 * TODO(rginda): Add numeric argument onAck to support partial consumption.
 *
 * @param {*} value The value to send.
 * @param {function()=} opt_onAck The optional function to invoke when the
 *   recipient acknowledges receipt.
 * @return {void}
 */
ExecuteContext.prototype.stdout = function(value, opt_onAck) {
  if (!this.isEphemeral('Ready')) {
    console.warn('Dropping stdout to closed execute context:', value);
    return;
  }

  this.onStdOut.fire(value, opt_onAck);
};

/**
 * Send stderr from this executable.
 *
 * This is not restricted to string values.  Recipients should filter out
 * non-string values in their onStdErr handler if necessary.
 *
 * TODO(rginda): Add numeric argument onAck to support partial consumption.
 *
 * @param {*} value The value to send.
 * @param {function()=} opt_onAck The optional function to invoke when the
 *   recipient acknowledges receipt.
 * @return {void}
 */
ExecuteContext.prototype.stderr = function(value, opt_onAck) {
  if (!this.isEphemeral('Ready')) {
    console.warn('Dropping stderr to closed execute context:', value);
    return;
  }

  this.onStdErr.fire(value, opt_onAck);
};

/**
 * Send stdout to this executable.
 *
 * This is not restricted to string values.  Recipients should filter out
 * non-string values in their onStdIn handler if necessary.
 *
 * TODO(rginda): Add opt_onAck.
 *
 * @param {*} value The value to send.
 * @return {void}
 */
ExecuteContext.prototype.stdin = function(value) {
  this.assertReady();
  if (this.callee) {
    this.callee.stdin(value);
  } else {
    this.onStdIn.fire(value);
  }
};
