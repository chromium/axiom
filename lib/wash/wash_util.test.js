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

import JsFileSystem from 'axiom/fs/js/file_system';
import JsDirectory from 'axiom/fs/js/directory';
import Path from 'axiom/fs/path';
import StdioSource from 'axiom/fs/stdio_source';
import washUtil from 'wash/wash_util';
import washExecutables from 'wash/exe_modules';

var failTest = function(error) {
  console.error('Test failing: ', error, error.stack);
  expect(error).toBeUndefined();
};

/**
 * @return {!Promise<!JsFileSystem>}
 */
var createJsfs = function() {
  var jsfs = new JsFileSystem();
  return jsfs.rootDirectory.mkdir('exe').then(
    function( /** JsDirectory */ jsdir) {
      jsdir.install(washExecutables);
      return Promise.resolve(jsfs);
    }
  )
};


describe('washUtil', function () {
  describe('findExecutable', function () {
    it('should lookup simple exe names in @PATH', function (done) {
      var testFullyCompleted = false;
      createJsfs().then(
        function(jsfs) {
          return jsfs.createExecuteContext(new Path('jsfs:/exe/wash'),
                                           new StdioSource().stdio,
                                           {}).then(
            function(cx) {
              cx.setEnvs({
                '@PATH': ['jsfs:/exe']
              });
              return washUtil.findExecutable(cx, 'cat').then(
                function(result) {
                  expect(result).toBeDefined();
                  testFullyCompleted = true;
                }
              );
            }
          )
        }
      ).catch(failTest).then(
        function() {
          expect(testFullyCompleted).toBe(true);
          done();
        }
      );
    });
    it('should allow absolute paths', function (done) {
      var testFullyCompleted = false;
      createJsfs().then(
        function(jsfs) {
          return jsfs.createExecuteContext(new Path('jsfs:/exe/wash'),
                                           new StdioSource().stdio,
                                           {}).then(
            function(cx) {
              return washUtil.findExecutable(cx, 'jsfs:/exe/cat').then(
                function(result) {
                  expect(result).toBeDefined();
                  testFullyCompleted = true;
                }
              );
            }
          )
        }
      ).catch(failTest).then(
        function() {
          expect(testFullyCompleted).toBe(true);
          done();
        }
      );
    });
  });
});
