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

import Parse from 'wash/parse';

var failTest = function(error) {
  expect(error).toBeUndefined();
};

describe('wash/parse', function () {

  it('should be available as a module', function() {
    expect(Parse).toBeDefined();
  });

  it('should parse boolean args', function() {

    var p = new Parse('--bool-arg');
    var args = p.parseArgs({ 'bool-arg': '?' });
    expect(args.getValue('bool-arg', false)).toBe(true);

    p = new Parse('--no-bool-arg');
    var args = p.parseArgs({ 'bool-arg': '?' });
    expect(args.getValue('yes', true)).toBe(false);
  });

});
