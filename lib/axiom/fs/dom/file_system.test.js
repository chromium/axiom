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

import DomFileSystem from 'axiom/fs/dom/file_system';
import FileSystemManager from 'axiom/fs/base/file_system_manager';
import DataType from 'axiom/fs/data_type';
import Path from 'axiom/fs/path';
import AxiomError from 'axiom/core/error';

var failTest = function(error) {
  expect(error).toBeUndefined();
};

describe('DomFileSystem', function () {
  if (!DomFileSystem.available()) {
    console.log('dom filesystem is not available. Skipping domfs tests.');
    return;
  }

  it('should be available as a module', function () {
    expect(DomFileSystem).toBeDefined();
  });

  describe('Test dom file system', function() {

    /** type {FileSystemManager} */
    var fsm;
    /** type {DomFileSystem} */
    var domfs;
    beforeEach(function (done) {
      fsm = new FileSystemManager();
      DomFileSystem.mount(fsm, 'tmp', 'temporary')
        .then(function(fs) {
          domfs = fs;
          domfs.mkdir(new Path('tmp:foo'))
          .then(function (dir) {
            return domfs.mkdir(new Path('tmp:foo/bar'));
          })
          .catch(failTest)
          .then(done);
      });
    });

   afterEach(function(done) {
     var root = new Path('tmp:');
      domfs.list(root)
        .then(function(entries) {
          var unlinks = [];
          for (var name in entries) {
            unlinks.push(domfs.unlink(root.combine(name)));
          }
          return Promise.all(unlinks);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have a readable folder named "foo"', function (done) {
      domfs.stat(new Path('tmp:foo')).then(function(rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(12);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have a root folder named "foo/bar" with no entries',
        function (done) {
      domfs.stat(new Path('tmp:foo/bar')).then(function(rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(12);
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow unlink of folder "foo/bar"', function (done) {
      domfs.unlink(new Path('tmp:foo/bar')).then(function() {
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow unlink of folder "foo"', function (done) {
      domfs.unlink(new Path('tmp:foo')).then(function() {
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow creating a file "bar.txt"', function (done) {
      var path = new Path('tmp:foo/bar.txt');
      var contents = "some text";
      domfs.writeFile(path, DataType.UTF8String, contents).then(function() {
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow reading from a file "bar.txt"', function (done) {
      var path = new Path('tmp:foo/bar.txt');
      var contents = "some text";
      domfs.writeFile(path, DataType.UTF8String, contents).then(function() {
        return domfs.readFile(path);
      }).then(function(file) {
        expect(file.data).toBe(contents);
      })
      .catch(failTest)
      .then(done);
    });

  });
});
