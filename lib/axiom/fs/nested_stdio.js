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
 */
export var NestedStdio = function(parentStdio) {
  // Note: we wrap the streams so that "onData", "onClose" and any other event
  // handlers added are scoped to the nested stdio lifetime.
  var stdin = new ReadableStreamForwarder(parentStdio.stdin);
  var signal = new ReadableStreamForwarder(parentStdio.signal);
  var ttyin = new ReadableStreamForwarder(parentStdio.ttyin);
  var stdout = new WritableStreamForwarder(parentStdio.stdout);
  var stderr = new WritableStreamForwarder(parentStdio.stderr);
  var ttyout = new WritableStreamForwarder(parentStdio.ttyout);
  Stdio.call(this, stdin, stdout, stderr, signal, ttyin, ttyout);

  /** @const @type {!Stdio} */
  this.parentStdio = parentStdio;
};

export default NestedStdio;

NestedStdio.prototype = Object.create(Stdio.prototype);
