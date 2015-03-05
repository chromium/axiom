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

import ReadableEventStream from 'axiom/fs/stream/readable_event_stream';


describe('ReadableEventStream', function () {
  it('should allow enqueuing events', function () {
    var stream = new ReadableEventStream();
    stream.push('test1');
    stream.push('test2');
    var v1 = stream.consume();
    var v2 = stream.consume();
    expect(v1).toEqual('test1');
    expect(v2).toEqual('test2');
  });

  it('should allow enqueuing events with callback', function () {
    var stream = new ReadableEventStream();
    var v1Consumed = false;
    stream.push('test1', function() { v1Consumed = true; });
    stream.push('test2');

    expect(v1Consumed).toEqual(false);
    var v1 = stream.consume();
    expect(v1).toEqual('test1');
    expect(v1Consumed).toEqual(true);

    v1Consumed = false;
    var v2 = stream.consume();
    expect(v2).toEqual('test2');
    expect(v1Consumed).toEqual(false);
  });
});
