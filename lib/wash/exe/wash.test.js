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

import DataType from 'axiom/fs/data_type';
import Path from 'axiom/fs/path';
import StdioSource from 'axiom/fs/stdio_source';

import FileSystem from 'axiom/fs/base/file_system';

import JsFileSystem from 'axiom/fs/js/file_system';
import JsDirectory from 'axiom/fs/js/directory';

import washExecutables from 'wash/exe_modules';

import {Wash} from 'wash/exe/wash';

import Parse from 'wash/parse';

/** @typedef {ExecuteContext$$module$axiom$fs$base$execute_context} */
var ExecuteContext;

/** @typedef {JsExecuteContext$$module$axiom$fs$js$execute_context} */
var JsExecuteContext;

var failTest = function(error) {
  console.error('Test failing: ', error, error.stack);
  expect(error).toBeUndefined();
};

/*
 * Mock implementation of readline to avoid dependency on terminal behavior.
 */
var readlineMock = function(cx) {
  cx.ready();
  cx.stdin.onData(function(value) {
    cx.closeOk(value);
  });
  cx.stdin.resume();
};

readlineMock.signature = {
  'help|h': '?',
  'input-history|i': '@',
  'prompt-string|p': '$'
};

/**
 * Creates an instance of `JsFileSystem` with all `Wash` executables installed.
 *
 * @return {!Promise<!JsFileSystem>}
 */
var createJsfs = function() {
  var jsfs = new JsFileSystem();
  return jsfs.rootDirectory.mkdir('exe').then(
    function(/** JsDirectory */jsdir) {
      jsdir.install(washExecutables);
      return Promise.resolve(jsfs);
    }
  );
};

/**
 * Creates an instance of `Wash` given a file system.
 *
 * @param {!JsFileSystem} jsfs
 * @return {!Promise<!Wash>}
 */
var createWash = function(jsfs, stdioSource) {
  return jsfs.createExecuteContext(
    new Path('jsfs:exe/wash'), stdioSource.stdio, {})
    .then(function (/** JsExecuteContext */cx) {
      var washExe = new Wash(cx);
      return Promise.resolve(washExe);
  });
};

/**
 * Execute a command though an instance of `Wash`.
 * @param {!Wash} wash
 * @param {!string} command
 * @return {!Promise}
 */
var executeCommand = function(wash, command) {
  return wash.evaluate(command);
};

/**
 * Compare the contents of two files given their path.
 * Return a rejected promise if there is a problem reading any of the 2 files.
 * Otherwise, the promise resolves to a `boolean` value indicating if the file
 * contents are equal.
 *
 * @param {!JsFileSystem} jsfs
 * @param {!string} pathSpec1
 * @param {!string} pathSpec2
 * @return {!Promise<boolean>}
 */
var compareFiles = function(jsfs, path1, path2) {
  return jsfs.readFile(path1).then(function(result1) {
    return jsfs.readFile(path2).then(function(result2) {
      return result1.data === result2.data;
    });
  });
};

describe('wash', function () {
  describe('redirection', function () {
    it('should allow writing to a file', function (done) {
      var testFullyCompleted = false;
      createJsfs().then(function(jsfs) {
        var path = new Path('jsfs:/test.txt');
        return jsfs.writeFile(path, DataType.UTF8String, 'hello there!')
            .then(function() {
          var stdioSource = new StdioSource();
          return createWash(jsfs, stdioSource).then(function(wash) {
            var path2 = new Path('jsfs:/test2.txt');
            var cmd = 'jsfs:/exe/cat ' + path.spec + ' >' + path2.spec + '';
            return executeCommand(wash, cmd).then(function() {
              return compareFiles(jsfs, path, path2)
                  .then(function(areEqual) {
                expect(areEqual).toBe(true);
                testFullyCompleted = true;
              });
            });
          });
        });
      }).catch(failTest).then(
        function() {
          expect(testFullyCompleted).toBe(true);
          done();
        }
      );
    });
  });
});
