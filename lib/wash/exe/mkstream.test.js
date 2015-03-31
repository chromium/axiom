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
import Path from 'axiom/fs/path';
import StdioSource from 'axiom/fs/stdio_source';
import JsFileSystem from 'axiom/fs/js/file_system';
import JsDirectory from 'axiom/fs/js/directory';

import washExecutables from 'wash/exe_modules';
import mkstream from 'wash/exe/mkstream';
import Parse from 'wash/parse';

var failTest = function(error) {
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
}

/**
 * @return {!Promise}
 */
var executeMkstream = function(jsfs, arg) {
  var path = new Path('jsfs:/exe/mkstream');
  var stdioSource = new StdioSource();
  var parse = new Parse(arg);
  var args = parse.parseArgs(mkstream.signature);
  return jsfs.createExecuteContext(path, stdioSource.stdio, args).then(
    function(cx) {
      return cx.execute();
    }
  );
};

/**
 * @param {!FileSystem} jsfs
 * @param {!string} pathSpec
 * @return {!Promise<!boolean>}
 */
var fileExists = function(jsfs, pathSpec) {
  return jsfs.stat(new Path(pathSpec)).then(
    function() {
      return true;
    }
  ).catch(
    function(error) {
      if (error instanceof AxiomError.NotFound)
        return false;
      return Promise.reject(error);
    }
  );
};

describe('mkstream', function () {

  it('should allow creating a stream', function (done) {
    createJsfs().then(
      function(jsfs) {
        return jsfs.rootDirectory.mkdir('streams').then(
          function() {
            return executeMkstream(jsfs,
                '--src https://foo.html --type iframe jsfs:/streams/foo');
          }
        ).then(
          function() {
            // Checking the file exist is enough to make sure mkstream worked
            return fileExists(jsfs, 'jsfs:/streams/foo').then(
              function(value) {
                expect(value).toBe(true);
              }
            );
          }
        )
      }
    ).catch(failTest)
    .then(done);
  });

  it('should fail if not all options are set', function (done) {
    createJsfs().then(
      function(jsfs) {
        return jsfs.rootDirectory.mkdir('streams').then(
          function() {
            return executeMkstream(jsfs,
                'jsfs:/streams/foo').catch(
              function(error) {
                expect(error).ToBeDefined();
              }
            );
          }
        )
      }
    ).catch(failTest)
    .then(done);
  });

});
