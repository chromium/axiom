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

  if (cx.getArg('help')) {
    cx.stdout.write([
      'usage: cat [<file>|-]...',
      '',
      'Reads files sequentially, writing them to the standard output.',
      'The file operands are processed in command-line order.',
      '',
      'If file is a single dash (`-`) or absent, cat reads from the standard',
      'input.'
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  // If no command line arguments were provided, default to 'read from stdin'.
  var list = cx.getArg('_', ['-']);
  var errors = false;
  var stdinReader = new Completer();

  if (list.indexOf('-') !== -1) {
    var stdinInput = '';
    cx.stdin.pause();
    cx.stdin.onData.addListener(function(data) {
      stdinInput += data;
    });
    cx.stdin.onEnd.listenOnce(function() {
      stdinReader.resolve(stdinInput);
    });
    cx.stdin.onClose.listenOnce(function(error) {
      // From `cat`'s perspective, abnormally closed stdin is not an error.
      stdinReader.resolve(stdinInput);
    });
    cx.stdin.resume();
  }

  var catNext = function() {
    if (!list.length) {
      return null;
    }

    /** @type {Promise} */
    var promise;
    /** @type {string} */
    var pathSpec = list.shift();

    if (pathSpec === '-') {
      promise = stdinReader.promise;
    } else {
      // TODO(ussuri): Switch to ReadableFileStreamBuffer.
      promise = cx.fileSystemManager.readFile(Path.abs(cx.getPwd(), pathSpec))
        .then(function(result) {
          return result.data;
        });
    }

    return promise
      .catch(function(error) {
        errors = true;
        cx.stderr.write('cat: ' + error.toString() + '\n');
        return '';
      }).then(function(data) {
        cx.stdout.write(data);
        return catNext();
      });
  };

  catNext().then(function() {
    if (errors) {
      cx.closeError(new AxiomError.Runtime('cat: Some files could not be read'));
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
