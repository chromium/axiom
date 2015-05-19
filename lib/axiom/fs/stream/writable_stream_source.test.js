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

describe('WritabeStreamSource', function () {
  it('should allow reading data', function () {
    var buffer = new MemoryStream();
    var stream = buffer.writableStream;
    stream.write('test1');
    stream.write('test2');
    var v1 = buffer.read();
    var v2 = buffer.read();
    expect(v1).toEqual('test1');
    expect(v2).toEqual('test2');
  });
});
