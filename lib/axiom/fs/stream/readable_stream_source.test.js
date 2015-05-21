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

import MemoryStream from 'axiom/fs/stream/memory_stream';

describe('ReadableStreamSource', function () {
  it('should allow reading data in paused mode', function () {
    var buffer = new MemoryStream();
    var stream = buffer.readableStream;

    buffer.write('test1');
    buffer.write('test2');

    expect(stream.read()).toEqual('test1');
    expect(stream.read()).toEqual('test2');
    expect(stream.read()).toBeUndefined();
  });

  it('should not allow reading data in flowing mode', function () {
    var buffer = new MemoryStream();
    var stream = buffer.readableStream;

    stream.resume();
    buffer.write('test1');
    buffer.write('test2');

    expect(function() { stream.read(); }).toThrow();
  });

  it('should only fire onReadable events in paused mode', function () {
    var buffer = new MemoryStream();
    var stream = buffer.readableStream;

    var onReadable = 0;
    var onData = 0;
    stream.onReadable.addListener(function() {
      onReadable++;
    });
    stream.onData.addListener(function() {
      onData++;
    });
    buffer.write('test1');
    buffer.write('test2');

    expect(onReadable).toEqual(2);
    expect(onData).toEqual(0);
    expect(stream.read()).toEqual('test1');
    expect(stream.read()).toEqual('test2');
    expect(stream.read()).toBeUndefined();
  });

  it('should only fire onData events in flowing mode', function () {
    var buffer = new MemoryStream();
    var stream = buffer.readableStream;

    stream.resume();
    var onReadable = 0;
    var data = [];
    stream.onReadable.addListener(function() {
      onReadable++;
    });
    stream.onData.addListener(function(value) {
      data.push(value);
    });
    buffer.write('test1');
    buffer.write('test2');

    expect(onReadable).toEqual(0);
    expect(data.length).toEqual(2);
    expect(data[0]).toEqual('test1');
    expect(data[1]).toEqual('test2');
  });
});
