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

import FileSystemManager from 'axiom/fs/base/file_system_manager';
import JsFileSystem from 'axiom/fs/js/file_system';

import Path from 'axiom/fs/path';

var failTest = function(error) {
  expect(error).toBeUndefined();
};

describe('FileSystemManager', function () {

  it('should be available as a module', function () {
    expect(FileSystemManager).toBeDefined();
  });

  it('should be automatically created with JsFileSystem', function () {
    var jsfs = new JsFileSystem();
    expect(jsfs.fileSystemManager).toBeDefined();
    expect(jsfs.name).toBe('jsfs');
  });

  describe('when empty', function () {
    it('should allow adding a named file system', function(done) {
      var fsm = new FileSystemManager();
      var jsfs = new JsFileSystem(fsm, 'jsfs');
      fsm.mount(jsfs);
      fsm.stat(new Path('jsfs:')).then(function (rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(8);
        })
        .catch(failTest)
        .then(done);
    });

    it('should throw adding the same file system twice', function() {
      var fsm = new FileSystemManager();
      var jsfs = new JsFileSystem(fsm, 'jsfs');
      fsm.mount(jsfs);
      expect(function() {
        fsm.mount(jsfs);
      }).toThrow();
    });
  });

  describe('when setup', function () {
    it('should have a default file system', function(done) {
      var fsm = new FileSystemManager();
      var jsfs1 = new JsFileSystem(fsm, 'jsfs1');
      var jsfs2 = new JsFileSystem(fsm, 'jsfs2');
      fsm.mount(jsfs1);
      fsm.mount(jsfs2);
      expect(fsm.defaultFileSystem).toBe(jsfs1);
      done();
    });

    it('should return all the file systems', function(done) {
      var fsm = new FileSystemManager();
      var jsfs1 = new JsFileSystem(fsm, 'jsfs1');
      var jsfs2 = new JsFileSystem(fsm, 'jsfs2');
      fsm.mount(jsfs1);
      fsm.mount(jsfs2);
      expect(fsm.getFileSystems().length).toBe(2);
      expect(fsm.getFileSystems()).toContain(jsfs1);
      expect(fsm.getFileSystems()).toContain(jsfs2);
      done();
    });

    it('should be able to install and run a simple executable', function(done) {
      var callbacks = {
        'foo': function(cx) {
          cx.ready();
          cx.closeOk(cx.getArg('_') + 'baz');
        }
      }
      callbacks['foo'].signature = {'_': '*'};

      var fsm = new FileSystemManager();
      var jsfs = new JsFileSystem(fsm, 'jsfs');
      fsm.mount(jsfs);

      expect(fsm.install).toBeDefined();

      return jsfs.rootDirectory.mkdir('exe').then(function (dir) {
        fsm.install(callbacks);
        return jsfs.list(new Path('jsfs:exe/'));
      }).then(function (entries) {
        expect(entries['foo']).toBeDefined();
        return jsfs.createExecuteContext(new Path('jsfs:/exe/foo'), {'_': ['bar']})
      }).then(function(cx) {
        return cx.execute();
      }).then(function(retval) {
        expect(retval).toBe('barbaz');
        done();
      })
      .catch(failTest)
    });

  });
});
