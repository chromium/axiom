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

import Stdio from 'axiom/fs/stdio';

import ReadableStreamForwarder from 'axiom/fs/stream/readable_stream_forwarder';
import WritableStreamForwarder from 'axiom/fs/stream/writable_stream_forwarder';

/**
 * @constructor @extends {Stdio}
 * @param {!Stdio} parentStdio
 * @param {string=} opt_name
 */
export var NestedStdio = function(parentStdio, opt_name) {
  var name =
      'NestedStdio ' + (opt_name || '<unnamed>') + ' <~ ' + parentStdio.name;
  var sName = '[' + name + ']';
  // Note: we wrap the streams so that "onData", "onEnd" and any other event
  // handlers added are scoped to the nested stdio lifetime.
  var stdin = new ReadableStreamForwarder(parentStdio.stdin, 'stdin ' + sName);
  var signal = new ReadableStreamForwarder(parentStdio.signal, 'signal ' + sName);
  var ttyin = new ReadableStreamForwarder(parentStdio.ttyin, 'ttyin ' + sName);
  var stdout = new WritableStreamForwarder(parentStdio.stdout, 'stdout ' + sName);
  var stderr = new WritableStreamForwarder(parentStdio.stderr, 'stderr ' + sName);
  var ttyout = new WritableStreamForwarder(parentStdio.ttyout, 'ttyout ' + sName);
  Stdio.call(this, stdin, stdout, stderr, signal, ttyin, ttyout, name);

  // Copy any additional properties from parent
  for(var key in parentStdio) {
    if (!this[key]) this[key] = parentStdio[key];
  }
  /** @const @type {!Stdio} */
  this.parentStdio = parentStdio;
};

export default NestedStdio;

NestedStdio.prototype = Object.create(Stdio.prototype);

/**
 * End the stream forwarders so that the .
 *
 * @return {void}
 */
NestedStdio.prototype.end = function() {
  this.stdin.end();
  this.signal.end();
  this.ttyin.end();
  this.stdout.end();
  this.stderr.end();
  this.ttyout.end();
};

/**
 * Detach event handlers of the stream forwarders from their source streams.
 *
 * @return {void}
 */
NestedStdio.prototype.close = function(error) {
  this.stdin.close(error);
  this.signal.close(error);
  this.ttyin.close(error);
  this.stdout.close(error);
  this.stderr.close(error);
  this.ttyout.close(error);
};
