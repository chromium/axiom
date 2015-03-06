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

import Termcap from 'wash/termcap';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * Clear the terminal screen and return the cursor to the home position.
 *
 * @param {JsExecuteContext} cx
 */
export var main = function(cx) {
  cx.ready();
  var tc = new Termcap();
  var output = tc.output('%clear-terminal()%set-row-column(row, column)',
                         {row: 1, column: 1});
  cx.stdout(output);
  cx.closeOk();
};

export default main;

main.signature = {};
