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
import OpenContext from 'axiom/fs/base/open_context';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * @param {JsExecuteContext} cx
 * @return {!Promise<*>}
 */
export var main = function(cx) {
  cx.ready();

  var list = cx.getArg('_', []);
  if (!list.length || cx.getArg('help')) {
    cx.stdout.write([
      'usage: touch <path> ...',
      'Create one or more empty files.'
    ].join('\r\n') + '\r\n');
    return cx.closeOk();
  }

  var fileSystem = cx.fileSystemManager;
  var errors = false;

  var touchNext = function() {
    if (!list.length) {
      return null;
    }

    /** @type {string} */
    var pathSpec = list.shift();
    /** @type {string} */
    var pwd = cx.getPwd();
    /** @type {Path} */
    var path = Path.abs(pwd, pathSpec);

    return fileSystem.createOpenContext(path, 'c').then(function(cx) {
      return OpenContext.scope(cx, function() {
        return cx.open().then(function() {
          return touchNext();
        });
      });
    }).catch(function(e) {
      errors = true;
      cx.stdout.write('touch: ' + path.originalSpec
          + ': ' + e.toString() + '\n');
      return touchNext();
    });
  };

  touchNext().then(function() {
    if (errors) {
      cx.closeError(new AxiomError.Runtime('Some files could not be touched'));
    } else {
      cx.closeOk();
    }
  });
};

export default main;

main.signature = {
  'help|h': '?',
  "_": '@'
};
