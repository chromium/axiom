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
import DataType from 'axiom/fs/data_type';
import Path from 'axiom/fs/path';

var failTest = function(error) {
  expect(error).toBeUndefined();
};

describe('JsFileSystem', function () {

  it('should be available as a module', function () {
    expect(JsFileSystem).toBeDefined();
  });

  describe('when empty', function () {
    it('should have a root folder', function(done) {
      var jsfs = new JsFileSystem();
      jsfs.stat(new Path('')).then(function (rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(8);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have a root folder named "/"', function(done) {
      var jsfs = new JsFileSystem();
      jsfs.stat(new Path('/')).then(function(rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(8);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have no entries when created', function(done) {
      var jsfs = new JsFileSystem();
      jsfs.list(new Path('/')).then(function (entries) {
          expect(entries).toEqual({});
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow creation of a directory', function (done) {
      var jsfs = new JsFileSystem();
      jsfs.rootDirectory.mkdir('foo').then(function (dir) {
        expect(dir).toBeDefined();
        expect(dir.mode).toBe(8);
      })
      .catch(failTest)
      .then(done);
    });
  });

  describe('when populated', function() {
    var jsfs = new JsFileSystem();
    beforeEach(function (done) {
        jsfs.rootDirectory.mkdir('foo')
        .then(function (dir) {
          return dir.mkdir('bar');
        })
        .catch(failTest)
        .then(done);
    });

    afterEach(function (done) {
      jsfs.list(new Path('/'))
        .then(function(entries) {
          var unlinks = [];
          for (var e in entries) {
            unlinks.push(jsfs.unlink(new Path(e)));
          }
          return Promise.all(unlinks);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have a readable folder named "foo"', function (done) {
      jsfs.stat(new Path('foo')).then(function(rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(8);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have a root folder named "foo/bar" with no entries',
       function (done) {
         jsfs.stat(new Path('foo/bar')).then(function(rv) {
           expect(rv).toBeDefined();
           expect(rv.mode).toBe(8);
         })
         .catch(failTest)
         .then(done);
       });

    it('should allow unlink of folder "foo/bar"', function (done) {
      jsfs.unlink(new Path('foo/bar')).then(function() {
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow unlink of folder "foo"', function (done) {
      jsfs.unlink(new Path('foo')).then(function() {
        })
        .catch(failTest)
        .then(done);
    });

  
    it('should allow creating a file "bar.txt"', function (done) {
      var path = new Path('foo/bar.txt');
      var contents = "some text";
      jsfs.writeFile(path, DataType.UTF8String, contents).then(function() {
      })
      .catch(failTest)
      .then(done);
    });

    it('should allow reading from a file "bar.txt"', function (done) {
      var path = new Path('foo/bar.txt');
      var contents = "some text";
      jsfs.writeFile(path, DataType.UTF8String, contents).then(function() {
        return jsfs.readFile(path);
      }).then(function(file) {
        expect(file.data).toBe(contents);
      })
      .catch(failTest)
      .then(done);
    });
});
});
