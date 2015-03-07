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

import MemoryStreamBuffer from 'axiom/fs/stream/memory_stream_buffer';

describe('MemoryStreamBuffer', function () {
  it('should allow enqueuing events', function () {
    var stream = new MemoryStreamBuffer();
    stream.write('test1');
    stream.write('test2');
    var v1 = stream.read();
    var v2 = stream.read();
    expect(v1).toEqual('test1');
    expect(v2).toEqual('test2');
  });

  it('should return undefined when calling consume on empty stream', function () {
    var stream = new MemoryStreamBuffer();
    var v1 = stream.read();
    var v2 = stream.read();
    expect(v1).toBeUndefined();
    expect(v2).toBeUndefined();
  });

  it('should allow enqueuing events with callback', function () {
    var stream = new MemoryStreamBuffer();
    var v1Consumed = false;
    stream.write('test1', function() { v1Consumed = true; });
    stream.write('test2');

    expect(v1Consumed).toEqual(false);
    var v1 = stream.read();
    expect(v1).toEqual('test1');
    expect(v1Consumed).toEqual(true);

    v1Consumed = false;
    var v2 = stream.read();
    expect(v2).toEqual('test2');
    expect(v1Consumed).toEqual(false);
  });

  it('should call callback for pushed events', function () {
    var stream = new MemoryStreamBuffer();
    stream.resume();
    var dataValue;
    stream.onData.addListener(function(value) {
      dataValue = value;
    });
    stream.write('test1');
    expect(dataValue).toEqual('test1');
    stream.pause();
    var v1 = stream.read();
    expect(v1).toBeUndefined();
  });

  it('should buffer events until resume is called', function () {
    var stream = new MemoryStreamBuffer();
    var dataValues = [];
    stream.onData.addListener(function(value) {
      dataValues.push(value);
    });

    stream.write('test1');
    stream.write('test2');
    stream.write('test3');
    expect(dataValues.length).toEqual(0);
    stream.resume();

    expect(dataValues.length).toEqual(3);
    expect(dataValues[0]).toEqual('test1');
    expect(dataValues[1]).toEqual('test2');
    expect(dataValues[2]).toEqual('test3');
  });
});
