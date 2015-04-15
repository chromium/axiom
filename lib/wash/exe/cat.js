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
import Completer from 'axiom/core/completer';
import Path from 'axiom/fs/path';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  var list = cx.getArg('_', []);
  if (!list.length || cx.getArg('help')) {
    cx.stdout.write([
      'usage: cat <file> ...',
      'Echo one or more files to stdout.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  var fileSystem = cx.fileSystemManager;
  var errors = false;

  var catNext = function() {
    if (!list.length) {
      return null;
    }

    /** @type {Promise} */
    var promise;
    /** @type {string} */
    var pathSpec = list.shift();
    
    if (pathSpec === '-') {
      var completer = new Completer();
      var input = '';
      cx.stdin.onData.addListener(function(data) {
        input += data;
      });
      cx.stdin.onEnd.listenOnce(function() {
        completer.resolve(input);
      });
      cx.stdin.resume();
      promise = completer.promise;
    } else {
      promise = fileSystem.readFile(Path.abs(cx.getPwd(), pathSpec))
        .then(function(result) {
          return result.data;
        });
    }
    
    return promise.then(function(data) {
      cx.stdout.write(data);
      return catNext();
    }).catch(function(e) {
      errors = true;
      cx.stdout.write('cat ' + pathSpec + ': ' + e.toString() + '\n');
      return catNext();
    });
  };

  catNext().then(function() {
    if (errors) {
      cx.closeError(new AxiomError.Runtime('Some files could not be read'));
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
