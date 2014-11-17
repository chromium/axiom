// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import hterm from 'hterm/public';

export var TerminalView = function(moduleManager) {
  this.moduleManager = moduleManager;

  TerminalView.sequence++;
  this.id = 'terminal-' + TerminalView.sequence;
  this.hterm_ = new hterm.Terminal();

  this.elem_ = null;

  this.executeContext = null;

  var viewsBinding = this.moduleManager.getServiceBinding('views@axiom');
  this.whenReady = viewsBinding.whenLoadedAndReady().then(function() {
      return viewsBinding.register(this.id, 'div');
    }.bind(this)).then(function() {
      return viewsBinding.show(this.id);
    }.bind(this)).then(function(elem) {
      this.elem_ = elem;
      this.hterm_.decorate(this.elem_);
      this.hterm_.installKeyboard();
      this.hterm_.io.onVTKeystroke = this.hterm_.io.sendString =
          this.onSendString_.bind(this);
      this.hterm_.io.onTerminalResize = this.onTerminalResize_.bind(this);
    }.bind(this));
};

export default TerminalView;

TerminalView.sequence = 0;

TerminalView.prototype.execute = function(pathSpec, arg, env) {
  this.whenReady.then(this.execute_.bind(this, pathSpec, arg, env));
};

TerminalView.prototype.execute_ = function(pathSpec, arg, env) {
  if (this.executeContext && this.executeContext.isReadyState('READY'))
    throw new AxiomError.Runtime('Already executing');

  var fileSystemBinding = this.moduleManager.getServiceBinding(
      'filesystems@axiom');

  return fileSystemBinding.createContext('execute', pathSpec, arg).then(
    function(cx) {
      this.executeContext = cx;
      this.executeContext.setEnvs(env);
      this.executeContext.onClose.addListener(this.onExecuteClose_, this);
      this.executeContext.onStdOut.addListener(this.onStdOut_, this);
      this.executeContext.onStdErr.addListener(this.onStdOut_, this);
      this.executeContext.onTTYRequest.addListener(this.onTTYRequest_, this);
      this.executeContext.setTTY({
        rows: this.hterm_.io.rowCount,
        columns: this.hterm_.io.columnCount
      });

      this.executeContext.onReady.addListener(function() {
        console.log('TerminalView: execute ready');
      });

      this.executeContext.onClose.addListener(function(reason, value) {
        console.log('TerminalView: execute closed: ' + reason, value);
      });

      this.executeContext.execute();
    }.bind(this));
};

TerminalView.prototype.print = function(str) {
  this.hterm_.io.print(str);
};

TerminalView.prototype.println = function(str) {
  this.hterm_.io.println(str);
};

/**
 * Handle for inbound messages from the default command.
 */
TerminalView.prototype.onStdOut_ = function(str, opt_onAck) {
  if (typeof str == 'string') {
    str = str.replace(/\n/g, '\r\n');
  } else {
    str = JSON.stringify(str) + '\r\n';
  }

  this.print(str);
  if (opt_onAck)
    opt_onAck();
};

/**
 * The default command exited.
 */
TerminalView.prototype.onExecuteClose_ = function(reason, value) {
  if (reason == 'ok') {
    this.println('Command exited: ' + this.executeContext.pathSpec + ', ' +
        JSON.stringify(value));

  } else {
    this.print('Error executing ' + this.executeContext.pathSpec + ': ' +
               JSON.stringify(value));
  }
};

TerminalView.prototype.onTTYRequest_ = function(request) {
  console.log('tty request');
  if (typeof request.interrupt == 'string')
    this.executeContext.setTTY({interrupt: request.interrupt});
};

/**
 * Called by hterm.Terminal.IO for keyboard events.
 *
 * We just forward them on to the default command.
 */
TerminalView.prototype.onSendString_ = function(str) {
  if (this.executeContext.isReadyState('READY')) {
    var interruptChar = this.executeContext.getTTY().interrupt;
    if (interruptChar && str == interruptChar) {
      console.log('interrupt');
      this.executeContext.signal('interrupt');
    } else {
      this.executeContext.stdin(str);
    }
  } else {
    console.warn('Execute not ready, ignoring input: ' + str);
  }
};

/**
 * Called by hterm.Terminal.IO when the terminal size changes.
 *
 * We just forward them on to the default command.
 */
TerminalView.prototype.onTerminalResize_ = function(columns, rows) {
  if (this.executeContext && this.executeContext.isReadyState('READY'))
    this.executeContext.setTTY({columns: columns, rows: rows});
};
