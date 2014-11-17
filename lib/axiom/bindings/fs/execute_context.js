// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import AxiomEvent from 'axiom/core/event';

import BaseBinding from 'axiom/bindings/base';
import FileSystem from 'axiom/bindings/fs/file_system';

/**
 * A binding that represents a running executable on FileSystem.
 *
 * You should only create an ExecuteContext by calling an instance of
 * FileSystem..createContext('execute', ...).
 *
 * @param {FileSystem} The parent file system.
 */
export var ExecuteContext = function(fileSystem, pathSpec, arg) {
  BaseBinding.call(this);

  /**
   * Parent file system.
   */
  this.fileSystem = fileSystem;

  /**
   * The path we're supposed to execute.
   */
  this.pathSpec = pathSpec;

  /**
   * The argument to pass to the executable.
   */
  this.arg = arg;

  // If the parent file system is closed, we close too.
  this.dependsOn(this.fileSystem);

  this.describeMethod('execute', {type: 'method', arg: []},
                      this.execute_.bind(this));

  /**
   * The ExecuteContext we're currently calling out to, if any.
   *
   * See ..setCallee().
   */
  this.callee = null;

  /**
   * Events sourced by this binding in addition to the inherited events from
   * BaseBinding.
   *
   * These are raised after the corresponding method is invoked.  For example,
   * signal(...) raises the onSignal event.
   */
  this.onSignal = new AxiomEvent();
  this.onStdOut = new AxiomEvent();
  this.onStdErr = new AxiomEvent();
  this.onStdIn = new AxiomEvent();
  this.onTTYChange = new AxiomEvent();
  this.onTTYRequest = new AxiomEvent();

  // An indication that the execute() method was called.
  this.didExecute_ = false;

  // The environtment variables for this execute context.
  this.env_ = {};

  // The tty state for this execute context.
  this.tty_ = {
    isatty: false,
    rows: 0,
    columns: 0,
    interrupt: String.fromCharCode('C'.charCodeAt(0) - 64)  // ^C
  };
};

export default ExecuteContext;

ExecuteContext.prototype = Object.create(BaseBinding.prototype);

ExecuteContext.prototype.executePromise = function() {
  var resolvePromise = null;
  var rejectPromise = null;
  var promise = new Promise(function(resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

  this.onClose.listenOnce(function(reason, value) {
    if (reason === 'ok') {
      resolvePromise(value);
    } else {
      rejectPromise(value);
    }
  });

  this.execute();

  return promise;
};

ExecuteContext.prototype.execute_ = function() {
  if (this.didExecute_) {
    return Promise.reject(new AxiomError.Runtime(
        'ExecuteContext..execute called multiple times'));
  }

  this.didExecute_ = true;
  return Promise.resolve();
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
 */
ExecuteContext.prototype.setCallee = function(executeContext) {
  if (this.callee)
    throw new Error('Still waiting for call:', this.callee);

  this.callee = executeContext;
  var previousInterruptChar = this.tty_.interrupt;

  var onClose = function() {
    this.callee.onStdOut.removeListener(this.onStdOut.fire);
    this.callee.onStdOut.removeListener(this.onStdErr.fire);
    this.callee.onTTYRequest.removeListener(this.onTTYRequest.fire);
    this.callee = null;

    if (this.tty_.interrupt != previousInterruptChar)
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
 */
ExecuteContext.prototype.call = function(pathSpec, arg) {
  this.setCallee(this.fileSystem.createContext('execute', pathSpec, arg));
  this.callee.execute();
  return this.callee;
};

/**
 * Return a copy of the internal tty state.
 */
ExecuteContext.prototype.getTTY = function() {
  var rv = {};
  for (var key in this.tty_) {
    rv[key] = this.tty_[key];
  }

  return rv;
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
 * The tty state is an object with the following properties:
 *
 *   tty {
 *     isatty: boolean, True if stdio-like methods are attached to a visual
 *       terminal.
 *     rows: integer, The number of rows in the tty.
 *     columns: integer, The number of columns in the tty.
 *     interrupt: string, The key used to raise an
 *       'Interrupt' signal.
 *   }
 *
 * @param {Object} tty An object containing one or more of the properties
 *   described above.
 */
ExecuteContext.prototype.setTTY = function(tty) {
  this.assertReadyState('WAIT', 'READY');

  if ('isatty' in tty)
    this.tty_.isatty = !!tty.isatty;
  if ('rows' in tty)
    this.tty_.rows = tty.rows;
  if ('columns' in tty)
    this.tty_.columns = tty.columns;

  if (!this.tty_.rows || !this.tty_.columns) {
    this.tty_.rows = 0;
    this.tty_.columns = 0;
    this.tty_.isatty = false;
  } else {
    this.tty_.isatty = true;
  }

  if (tty.rows < 0 || tty.columns < 0)
    throw new Error('Invalid tty size.');

  if ('interrupt' in tty)
    this.tty_.interrupt = tty.interrupt;

  this.onTTYChange.fire(this.tty_);

  if (this.callee)
    this.callee.setTTY(tty);
};

/**
 * Request a change to the controlling tty.
 *
 * At the moment only the 'interrupt' property can be changed.
 *
 * @param {Object} tty An object containing a changeable property of the
 *   tty.
 */
ExecuteContext.prototype.requestTTY = function(tty) {
  this.assertReadyState('READY');

  if (typeof tty.interrupt == 'string')
    this.onTTYRequest.fire({interrupt: tty.interrupt});
};

/**
 * Get a copy of the current environment variables.
 */
ExecuteContext.prototype.getEnvs = function() {
  var rv = {};
  for (var key in this.env_) {
    rv[key] = this.env_[key];
  }

  return rv;
};

/**
 * Get the value of the given environment variable, or the provided
 * defaultValue if it is not set.
 *
 * @param {string} name
 * @param {*} defaultValue
 */
ExecuteContext.prototype.getEnv = function(name, defaultValue) {
  if (this.env_.hasOwnProperty(name))
    return this.env_[name];

  return defaultValue;
};

/**
 * Overwrite the current environment.
 *
 * @param {Object} env
 */
ExecuteContext.prototype.setEnvs = function(env) {
  this.assertReadyState('WAIT', 'READY');
  for (var key in env) {
    this.env_[key] = env[key];
  }
};

/**
 * Set the given environment variable.
 *
 * @param {string} name
 * @param {*} value
 */
ExecuteContext.prototype.setEnv = function(name, value) {
  this.assertReadyState('WAIT', 'READY');
  this.env_[name] = value;
};

/**
 * Create a new context using the fs.FileSystem for this execute context, bound
 * to the lifetime of this context.
 */
ExecuteContext.prototype.createContext = function(name, pathSpec, arg) {
  var cx = this.fileSystem.createContext(name, pathSpec, arg);
  cx.dependsOn(this);
  return cx;
};

/**
 * Send a signal to the running executable.
 *
 * The only signal defined at this time has the name 'Interrupt' and a null
 * value.
 *
 * @param {name}
 * @param {value}
 */
ExecuteContext.prototype.signal = function(name, value) {
  this.assertReady();
  if (this.callee) {
    this.callee.closeErrorValue(new AxiomError.Interrupt());
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
 * @param {function()} opt_onAck The optional function to invoke when the
 *   recipient acknowledges receipt.
 */
ExecuteContext.prototype.stdout = function(value, opt_onAck) {
  if (!this.isReadyState('READY')) {
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
 * @param {function()} opt_onAck The optional function to invoke when the
 *   recipient acknowledges receipt.
 */
ExecuteContext.prototype.stderr = function(value, opt_onAck) {
  if (!this.isReadyState('READY')) {
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
 */
ExecuteContext.prototype.stdin = function(value) {
  this.assertReady();
  if (this.callee) {
    this.callee.stdin(value);
  } else {
    this.onStdIn.fire(value);
  }
};
