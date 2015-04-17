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
import AxiomEvent from 'axiom/core/event';

/**
 * Base class of all stream implementations.
 *
 * @constructor
 */
export var AxiomStream = function() {
  /** @type {!boolean} */
  this.closed_ = false;

  /** @type {!AxiomEvent} */
  this.onClose = new AxiomEvent();
};

export default AxiomStream;

/**
 * @return {void}
 */
AxiomStream.prototype.assertOpen = function() {
  if (this.closed_)
    throw new AxiomError.Runtime('Stream is already closed');
};

/**
 * @return {void}
 */
AxiomStream.prototype.close = function() {
  this.assertOpen();
  this.closed_ = true;
  this.onClose.fire();
};
