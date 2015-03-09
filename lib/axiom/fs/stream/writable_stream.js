// Copyright 2015 Google Inc. All rights reserved.
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
import AxiomStream from 'axiom/fs/stream/axiom_stream';

var abstract = function() { throw new AxiomError.AbstractCall() };

/** @typedef function():void */
var WriteCallback;

/**
 * @constructor @extends {AxiomStream}
 */
export var WritableStream = function() {
  AxiomStream.call(this);
};

export default WritableStream;

WritableStream.prototype = Object.create(AxiomStream.prototype);

/**
 * Write an event to the stream.
 *
 * @param {!*} value
 * @param {WriteCallback=} opt_callback
 * @return {void}
 */
WritableStream.prototype.write = function(value, opt_callback) {
  abstract();
};
