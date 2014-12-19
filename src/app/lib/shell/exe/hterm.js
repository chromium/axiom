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

import TerminalView from 'shell/views/terminal';

/**
 * Simple callback for a JsExecutable which echos the argument list to stdout
 * and exits.
 */
export var main = function(cx) {
  cx.ready();
  var tv = new TerminalView(this.moduleManager);
  var command = cx.arg['command'] || '/addon/shell/exe/wash';
  var arg = cx.arg['arg'] || {};
  var env = cx.arg['env'] || {
    '@PATH': ['/addon/shell/exe/'],
    '$TERM': 'xterm-256color'
  };
  tv.execute(command, arg, env);
  return Promise.resolve(null);
};

export default main;

/**
 * Accept any value for the execute context arg.
 */
main.argSigil = '%';
