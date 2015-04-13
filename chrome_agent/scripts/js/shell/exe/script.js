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

define(
  "shell/exe/script",
  ["axiom/core/error", "wash/washrc", "exports"],
  function(axiom$core$error$$, wash$washrc$$, __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var AxiomError;
    AxiomError = axiom$core$error$$["default"];
    var Washrc;
    Washrc = wash$washrc$$["default"];

    /** @typedef ExecuteContext$$module$axiom$bindings$fs$execute_context */
    var ExecuteContext;

    /** @typedef JsExecutable$$module$axiom$fs$js_executable */
    var JsExecutable;

    /**
     * An executable to import cross origin script into the shell.
     *
     * @this {JsExecutable}
     * @param {ExecuteContext} cx
     */
    var main = function(cx) {
      cx.ready();

      var list = cx.getArg('_', []);

      if (list.length != 1 || cx.getArg('help')) {
        cx.stdout.write([
          'usage: script <url>',
          'Load a new script from the network.',
          '',
          'This will load an arbitrary script from the network and run it as',
          'part of the web shell.  There are no security guarantees.  Please',
          'be careful with this command, especially if you have the gdrive',
          'file system mounted.',
          '',
          'Please see http://goo.gl/DmDqct#script for more information about this',
          'command.'
        ].join('\r\n') + '\r\n');
        cx.closeOk();
        return;
      }

      var url = list[0];

      var s = document.createElement('script');
      s.src = url;
      s.type = 'text/javascript';

      var state = 0;

      s.ready = function(callback) {
        if (!state) {
          callback(cx);
          state = 1;
          if (cx.getArg('save')) {
            var washrc = new Washrc(cx);
            var args = {};
            args['_'] = list;
            washrc.append({'script': args}).then(function() {
              cx.closeOk();
            });
          } else {
            cx.closeOk();
          }
          return;
        }

        if (state === 1) {
          cx.closeError(new AxiomError.Runtime(
              'Duplicate call to script callback.'));
          return;
        }

          cx.closeError(new AxiomError.Runtime(
              'Import script callback called after a timeout.'));
          return;
      };

      document.head.appendChild(s);

      window.setTimeout(function() {
        // import script request timed out.
        if (!state) {
          state = 2;
          cx.closeError(new AxiomError.Runtime('Import script request timed out.'));
        }
      }, 5000);
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    /**
     * Accept any value for the execute context arg.
     */
    main.signature = {
      'help|h': '?',
      'save|s': '?',
      '_': '@'
    };
  }
);

//# sourceMappingURL=script.js.map