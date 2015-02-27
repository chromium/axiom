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


/** @typedef ExecuteContext$$module$axiom$bindings$fs$execute_context */
var ExecuteContext;

/** @typedef JsExecutable$$module$axiom$fs$js_executable */
var JsExecutable;


var IMPORT_CMD_USAGE_STRING = 'usage: import-url';

/**
 * An executable to import cross origin script into the shell.
 *
 * @this {JsExecutable}
 * @param {ExecuteContext} cx
 */
var main = function(cx) {
  cx.ready();
  var arg = cx.arg;

  if (!arg['_'] || (arg['_'].length < 1) || arg['h'] || arg['help']) {
    cx.stdout(IMPORT_CMD_USAGE_STRING + '\n');
    return Promise.resolve(null);
  }

  var url = arg['_'][0];

  // TODO(grv): add timeout as a command line argument.

  var s = document.createElement('script');
  s.src = url;
  s.type = 'text/javascript';

  var done = false;

  s.ready = function(callback) {
    if (!done) {
      callback(cx);
      cx.closeOk();
      done = true;
    }
  };

  document.getElementsByTagName('head')[0].appendChild(s);

  setTimeout(function() {
    // import request timed out.
    if (!done) {
      done = true;
      cx.stdout('import: Request timed out.');
      cx.closeOk();
    }
  }, 5000);

  return cx.ephemeralPromise;
};

export {main};
export default main;

/**
 * Accept any value for the execute context arg.
 */
main.argSigil = '%';
