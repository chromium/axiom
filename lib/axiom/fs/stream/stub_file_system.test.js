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

import MemoryStreamBuffer from 'axiom/fs/stream/memory_stream_buffer';
import Transport from 'axiom/fs/stream/transport';
import Channel from 'axiom/fs/stream/channel';
import StubFileSystem from 'axiom/fs/stream/stub_file_system';
import SkeletonFileSystem from 'axiom/fs/stream/skeleton_file_system';
import JsFileSystem from 'axiom/fs/js/file_system';
import FileSystemManager from 'axiom/fs/base/file_system_manager';
import Path from 'axiom/fs/path';

var failTest = function(error) {
  expect(error).toBeUndefined();
};

/**
 * @constructor
 */
var TestHelper = function() {
};

/**
 * @param {string} fileSystemName
 * @return {!Promise<!StubFileSystem>}
 */
TestHelper.prototype.createStubFileSystem = function(name) {
  return this.createJsFileSystem_().then(
    function(jsfs) {
      return this.createStubFileSystem_(name, jsfs);
    }.bind(this)
  );
};

/**
 * @param {string} fileSystemName
 * @param {!JsFileSystem} jsfs
 * @return {!Promise<!StubFileSystem>}
 */
TestHelper.prototype.createStubFileSystem_ = function(name, jsfs) {
  var stubStream = new MemoryStreamBuffer();
  var skeletonStream = new MemoryStreamBuffer();

  var stubTransport = new Transport(
      'stub-transport',
      stubStream.readableStream,
      skeletonStream.writableStream);
  var skeletonTransport = new Transport(
      'skeleton-transport',
      skeletonStream.readableStream,
      stubStream.writableStream);

  var stubChannel =  new Channel('stub-channel', stubTransport);
  var skeletonChannel =  new Channel('skeleton-channel', skeletonTransport);

  var fsm = new FileSystemManager();
  var stubFileSystem = new StubFileSystem(fsm, name, stubChannel);

  var skeletonFileSystem = new SkeletonFileSystem('js', jsfs, skeletonChannel);

  stubFileSystem.onClose.addListener(function() {
    stubStream.close();
    skeletonStream.close();
  });
  stubStream.resume();
  skeletonStream.resume();

  // Connect file system to remote end to make sure we have a valid
  // and supported Channel.
  return stubFileSystem.connect().then(
    function() {
      fsm.mount(stubFileSystem);
      return stubFileSystem;
    }
  )
};

/**
 * @return {!Promise<!JsFileSystem>}
 */
TestHelper.prototype.createJsFileSystem_ = function() {
  var jsfs = new JsFileSystem();
  return jsfs.rootDirectory.mkdir('foo').then(
    function (dir) {
      return dir.mkdir('bar');
    }
  ).then(
    function() {
      return jsfs.rootDirectory.mkdir('foo2').then(
        function(dir) {
          return jsfs;
        }
      );
    }
  );
};

describe('StubFileSystem', function () {
  it('should allow listing entries', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        return fileSystem.list(new Path('remotefs:/')).then(
          function(entries) {
            expect(entries).toBeDefined();
            expect(entries.length).toBe(2);
            var names = entries.map(function(x) { return x.name; });
            expect(names).toContain('foo');
            expect(names).toContain('foo2');
          }
        );
      }
    ).catch(failTest).then(done);
  });
});
