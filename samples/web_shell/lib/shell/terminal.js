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
import Path from 'axiom/fs/path';

import hterm from 'hterm/public';

/**
 * @constructor
 */
var TerminalView = function() {
  TerminalView.sequence++;
  this.id = 'terminal-' + TerminalView.sequence;

  this.htermElem_ = document.createElement('div');
  this.htermElem_.style.cssText = (
      'position: absolute; ' +
      'z-index: 100; ' +
      'top: 0px; ' +
      'bottom: 0px; ' +
      'height: 0px' +
      'width: 0px');

  var container = TerminalView.getIframeContainer();
  container.appendChild(this.htermElem_);

  this.hterm_ = new hterm.Terminal();
  this.hterm_.decorate(this.htermElem_);
  this.hterm_.config.set('use-default-window-copy', true);
  this.hterm_.config.set('ctrl-c-copy', true);
  this.hterm_.config.set('pass-meta-number', true);
  this.hterm_.config.set('pass-alt-number', true);
  this.hterm_.installKeyboard();
  this.hterm_.io.onVTKeystroke = this.hterm_.io.sendString =
  this.onSendString_.bind(this);
  this.hterm_.io.onTerminalResize = this.onTerminalResize_.bind(this);

  this.elem_ = null;

  this.executeContext = null;

  var viewElem = document.createElement('div');
  viewElem.style.cssText = (
      'position: absolute; ' +
      'top: 0px; ' +
      'left: 0px; ' +
      'height: 100%;' +
      'width: 100%');
  document.body.appendChild(viewElem);

  this.viewElem_ = viewElem;
  var object = document.createElement('object');
  object.style.cssText = (
      'display: block; ' +
      'position: absolute; ' +
      'top: 0; ' +
      'left: 0; ' +
      'height: 100%; ' +
      'width: 100%; ' +
      'overflow: hidden; ' +
      'pointer-events: none;');

  var onResize = function() {
    TerminalView.resizeIframes();
  }.bind(this);

  object.onload = function() {
    this.contentDocument.defaultView.addEventListener(
        'resize', onResize);
    onResize();
  };

  object.type = 'text/html';
  object.data = 'about:blank';

  this.htermElem_.followObject = object;
  this.viewElem_.appendChild(object);
};

export {TerminalView};
export default TerminalView;

TerminalView.sequence = 0;

TerminalView.raf_ = null;

TerminalView.resizeIframes = function() {
  if (TerminalView.raf_)
    return;

  TerminalView.raf_ = requestAnimationFrame(function() {
    TerminalView.raf_ = null;

    var container = TerminalView.getIframeContainer();
    for (var i = 0; i < container.children.length; i++) {
      var htermElem = container.children[i];
      var r = htermElem.followObject.getBoundingClientRect();
      htermElem.style.top = r.top + 'px';
      htermElem.style.left = r.left + 'px';
      htermElem.style.width = r.width + 'px';
      htermElem.style.height = r.height + 'px';
    }
  });
};

TerminalView.getIframeContainer = function() {
  var node = document.querySelector('#iframe-container');
  if (!node) {
    node = document.createElement('div');
    node.id = 'iframe-container';
    node.style.cssText = (
        'position: absolute; ' +
        'top: 0px; ' +
        'bottom: 0px; ' +
        'height: 0px' +
        'width: 0px');
    document.body.appendChild(node);
  }

  return node;
};

TerminalView.viewClosed = function(followObject) {
  var container = TerminalView.getIframeContainer();
  for (var i = 0; i < container.children.length; i++) {
    var htermElem = container.children[i];
    if (htermElem.followObject === followObject) {
      container.removeChild(htermElem);
      break;
    }
  }
};

// TODO(rpaquay): pathSpec => Path
TerminalView.prototype.execute = function(cx) {
  if (this.executeContext && this.executeContext.isEphemeral('Ready'))
    throw new AxiomError.Runtime('Already executing');

  this.executeContext = cx;
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
    this.hterm_.uninstallKeyboard();
  }.bind(this));

  this.executeContext.execute();
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
    this.println('Command exited: ' + this.executeContext.path + ', ' +
        JSON.stringify(value));

  } else {
    this.print('Error executing ' + this.executeContext.path + ': ' +
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
  if (this.executeContext.isEphemeral('Ready')) {
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
  if (this.executeContext && this.executeContext.isEphemeral('Ready'))
    this.executeContext.setTTY({columns: columns, rows: rows});
};
