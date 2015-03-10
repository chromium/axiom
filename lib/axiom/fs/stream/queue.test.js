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

import Queue from 'axiom/fs/stream/queue';

describe('Queue', function () {
  it('should return undefined when empty', function () {
    var q = new Queue();
    expect(q.empty()).toBe(true);

    var item = q.dequeue();
    expect(item).toBeUndefined();
  });

  it('should allow enqueuing data', function () {
    var q = new Queue();
    q.enqueue(5);
    expect(q.empty()).toBe(false);
    q.enqueue(6);
    q.enqueue(7);

    var v1 = q.dequeue();
    expect(v1).toEqual(5);
    var v2 = q.dequeue();
    expect(v2).toEqual(6);
    var v3 = q.dequeue();
    expect(v3).toEqual(7);
    expect(q.empty()).toBe(true);
  });
});
