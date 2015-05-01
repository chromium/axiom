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
import Arguments from 'axiom/fs/arguments';
import MemoryStreamBuffer from 'axiom/fs/stream/memory_stream_buffer';
import Transport from 'axiom/fs/stream/transport';
import Channel from 'axiom/fs/stream/channel';
import StubFileSystem from 'axiom/fs/stream/stub_file_system';
import SkeletonFileSystem from 'axiom/fs/stream/skeleton_file_system';
import JsFileSystem from 'axiom/fs/js/file_system';
import FileSystemManager from 'axiom/fs/base/file_system_manager';
import Path from 'axiom/fs/path';
import DataType from 'axiom/fs/data_type';
import StdioSource from 'axiom/fs/stdio_source';

var failTest = function(error) {
  console.error('Test failing: ', error, error.stack);
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

  var stubChannel =  new Channel('stub', 'stub', stubTransport);
  var skeletonChannel =  new Channel('skeleton', 'skeleton', skeletonTransport);

  var fsm = new FileSystemManager();
  var stubFileSystem = new StubFileSystem(fsm, name, stubChannel);

  var skeletonFileSystem = new SkeletonFileSystem('js', jsfs, skeletonChannel);

  stubFileSystem.onClose.addListener(function(error) {
    stubStream.close(error);
    skeletonStream.close(error);
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
  );
};

/**
 * @return {!Promise<!JsFileSystem>}
 */
TestHelper.prototype.createJsFileSystem_ = function() {
  var jsfs = new JsFileSystem();
  return jsfs.rootDirectory.mkdir('foo').then(
    function (dir) {
      return dir.mkdir('bar').then(
        function() {
          return jsfs.writeFile(
              jsfs.rootPath.combine('foo/test.txt'),
              DataType.UTF8String,
              'This is a text file');
        }
      );
    }
  ).then(
    function() {
      return jsfs.rootDirectory.mkdir('foo2').then(
        function(dir) {
          var helloMain = function(cx) {
            console.log('Hello executable is running!');
            cx.ready();
            cx.stdout.write('hello!');
            cx.stderr.write('some error!');
            cx.closeOk();
          };
          helloMain.signature = { '_': '@' };

          // Write to stdout a single value read from stdin
          var echoMain = function(cx) {
            console.log('Echo executable is running!');
            cx.ready();
            cx.stdin.onData.addListener(function(value) {
              cx.stdout.write('echo: ' + value);
              cx.closeOk();
            });
            cx.stdin.resume();
          };
          echoMain.signature = { '_': '@' };

          // Write to stdout all the values read from stdin
          var echoReadMain = function(cx) {
            console.log('EchoRead executable is running!');
            cx.ready();

            var readAll = function() {
              var value;
              while(value = cx.stdin.read()) {
                cx.stdout.write('echo: ' + value);
              }
              // TODO(rpaquay): This should be done via a "onEnd" event.
              cx.closeOk();
            };

            cx.stdin.onReadable.addListener(function() {
              readAll();
            });

            readAll();
          };
          echoReadMain.signature = { '_': '@' };

          // write to stdout all the values passed as arguments
          var echoArgMain = function(cx) {
            console.log('EchoArg executable is running!');
            cx.ready();

            var list = cx.getArg('_');
            list.forEach(function(value) {
              cx.stdout.write('echo: ' + value + '\n');
            })
            cx.closeOk();
          };
          echoArgMain.signature = { '_': '@' };

          var cmds = {
            hello: helloMain,
            echo: echoMain,
            echoRead: echoReadMain,
            echoArg: echoArgMain
          };
          dir.install(cmds);
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
            var names = Object.keys(entries);
            expect(names.length).toBe(2);
            expect(names).toContain('foo');
            expect(names).toContain('foo2');
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow stat on a directory', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        return fileSystem.stat(new Path('remotefs:/foo')).then(
          function(statResult) {
            expect(statResult).toBeDefined();
            expect(statResult.mode).toBe(Path.Mode.D);
            expect(statResult.size).toBe(0);
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow creating an alias', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var pathFrom = new Path('remotefs:/foo/test.txt');
        var pathTo = new Path('remotefs:/foo2/test.txt');
        return fileSystem.alias(pathFrom, pathTo).then(
          function() {
            return fileSystem.stat(pathTo).then(
              function(statResult) {
                expect(statResult).toBeDefined();
              }
            );
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow creating a directory', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo2/baz');
        return fileSystem.mkdir(path).then(
          function() {
            return fileSystem.stat(path).then(
              function(statResult) {
                expect(statResult).toBeDefined();
                expect(statResult.mode).toBe(Path.Mode.D);
                expect(statResult.size).toBe(0);
              }
            );
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow creating and closing an open context', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo/test.txt');
        return fileSystem.createOpenContext(path,'r').then(
          function(cx) {
            return cx.open().then(
              function() {
                expect(cx).toBeDefined();
                expect(cx.isEphemeral('Ready')).toBe(true);
                cx.closeOk();
              }
            )
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow reading a file', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo/test.txt');
        return fileSystem.readFile(path).then(
          function(readResult) {
            expect(readResult).toBeDefined();
            // TODO(rpaquay): Should this be `DataType.UTF8String` instead?
            expect(readResult.dataType).toBe(DataType.Value);
            expect(readResult.data).toBe('This is a text file');
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should return error reading an invalid file', function (done) {
    var testFullyCompleted = false;
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo/unknown_file.txt');
        return fileSystem.readFile(path).then(
          function(readResult) {
            // Should not reach here
            expect(true).toBe(false);
          },
          function(error) {
            expect(error).toBeDefined();
            expect(AxiomError.NotFound.test(error)).toBe(true);
            testFullyCompleted = true;
          }
        );
      }
    ).catch(failTest).then(
      function() {
        expect(testFullyCompleted).toBe(true);
        done();
      }
    );
  });

  it('should allow writing a file', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo/test2.txt');
        var dataType = DataType.UTF8String;
        var data = 'This is another text file';
        return fileSystem.writeFile(path, dataType, data).then(
          function(writeResult) {
            expect(writeResult).toBeDefined();
            expect(writeResult.dataType).toBe(DataType.Value);
            expect(writeResult.data).toBe(data);
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow copying a file', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var fromPath = new Path('remotefs:/foo/test.txt');
        var toPath = new Path('remotefs:/foo/test2.txt');
        return fileSystem.copy(fromPath, toPath).then(
          function() {
            return fileSystem.stat(fromPath).then(
              function(fromResult) {
                return fileSystem.stat(toPath).then(
                  function(toResult) {
                    expect(toResult).toBeDefined();
                    expect(toResult.mode).toBe(fromResult.mode);
                    expect(toResult.size).toBe(fromResult.size);
                  }
                );
              }
            );
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow moving a file', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var fromPath = new Path('remotefs:/foo/test.txt');
        var toPath = new Path('remotefs:/foo2/test.txt');
        return fileSystem.stat(fromPath).then(
          function(fromResult) {
            return fileSystem.move(fromPath, toPath).then(
              function() {
                return fileSystem.stat(toPath).then(
                  function(toResult) {
                    expect(toResult).toBeDefined();
                    expect(toResult.mode).toBe(fromResult.mode);
                    expect(toResult.size).toBe(fromResult.size);
                  }
                );
              }
            );
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow deleting a file', function (done) {
    var testFullyCompleted = false;
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo/test.txt');
        return fileSystem.unlink(path).then(
          function() {
            return fileSystem.stat(path).then(
              failTest,
              function(error) {
                expect(error).toBeDefined();
                expect(AxiomError.NotFound.test(error)).toBe(true);
                testFullyCompleted = true;
              }
            );
          }
        );
      }
    ).catch(failTest).then(
      function() {
        expect(testFullyCompleted).toBe(true);
        done();
      }
    );
  });


  it('should not allow installing an executable', function (done) {
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        return new Promise(function(resolve, reject) {
          var exe = {};
          fileSystem.install(exe)
          resolve();
        }).then(
          failTest,
          function(error) {
            expect(error).toBeDefined();
          }
        );
      }
    ).catch(failTest).then(done);
  });

  it('should allow running a command', function (done) {
    var testFullyCompleted = false;
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo2/hello');
        var stdioSource = new StdioSource();

        var stdoutData = '';
        stdioSource.stdout.onData.addListener(function(value) {
          stdoutData += value;
        });
        stdioSource.stdout.resume();

        var stderrData = '';
        stdioSource.stderr.onData.addListener(function(value) {
          stderrData += value;
        });
        stdioSource.stderr.resume();

        var stdio = stdioSource.stdio;
        return fileSystem.createExecuteContext(path, stdio, {}).then(
          function(cx) {
            return cx.execute().then(
              function() {
                expect(stdoutData).toBe('hello!');
                expect(stderrData).toBe('some error!');
                testFullyCompleted = true;
              }
            );
          }
        );
      }
    ).catch(failTest).then(
      function() {
        expect(testFullyCompleted).toBe(true);
        done();
      }
    );
  });

  it('should allow running a command using stdin', function (done) {
    var testFullyCompleted = false;
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo2/echo');
        var stdioSource = new StdioSource();

        stdioSource.stdin.write('hello!')

        var stdoutData = '';
        stdioSource.stdout.onData.addListener(function(value) {
          stdoutData += value;
        });
        stdioSource.stdout.resume();

        var stdio = stdioSource.stdio;
        return fileSystem.createExecuteContext(path, stdio, {}).then(
          function(cx) {
            return cx.execute().then(
              function() {
                expect(stdoutData).toBe('echo: hello!');
                testFullyCompleted = true;
              }
            );
          }
        );
      }
    ).catch(failTest).then(
      function() {
        expect(testFullyCompleted).toBe(true);
        done();
      }
    );
  });

  it('should allow running a command using stdin + read', function (done) {
    var testFullyCompleted = false;
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo2/echoRead');
        var stdioSource = new StdioSource();

        stdioSource.stdin.write('hello!')

        var stdoutData = '';
        stdioSource.stdout.onData.addListener(function(value) {
          stdoutData += value;
        });
        stdioSource.stdout.resume();

        var stdio = stdioSource.stdio;
        return fileSystem.createExecuteContext(path, stdio, {}).then(
          function(cx) {
            return cx.execute().then(
              function() {
                expect(stdoutData).toBe('echo: hello!');
                testFullyCompleted = true;
              }
            );
          }
        );
      }
    ).catch(failTest).then(
      function() {
        expect(testFullyCompleted).toBe(true);
        done();
      }
    );
  });

  it('should allow running a command with arguments', function (done) {
    var testFullyCompleted = false;
    var helper = new TestHelper();
    helper.createStubFileSystem('remotefs').then(
      function(fileSystem) {
        var path = new Path('remotefs:/foo2/echoArg');
        var stdioSource = new StdioSource();

        // Create arguments *exactly* the same way as wash: pass the signature
        // in the constructor, but not default values. Values are set through
        // calling "Record.setValue()".
        var argSignature = {
          '_': '@'
        };
        var args = new Arguments(argSignature, {});
        args.getRecord('_').setValue(['hello', 5]);

        var stdoutData = '';
        stdioSource.stdout.onData.addListener(function(value) {
          stdoutData += value;
        });
        stdioSource.stdout.resume();

        var stdio = stdioSource.stdio;
        return fileSystem.createExecuteContext(path, stdio, args).then(
          function(cx) {
            return cx.execute().then(
              function() {
                expect(stdoutData).toBe('echo: hello\necho: 5\n');
                testFullyCompleted = true;
              }
            );
          }
        );
      }
    ).catch(failTest).then(
      function() {
        expect(testFullyCompleted).toBe(true);
        done();
      }
    );
  });
});
