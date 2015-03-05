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

import Path from 'axiom/fs/path';

var failTest = function(error) {
  expect(error).toBeUndefined();
};

describe('Path', function () {
  it('should be available as a module', function () {
    expect(Path).toBeDefined();
  });

  it('should not allow undefined path', function () {
    expect(function() {
      /** @type {string} */
      var x;
      var p = new Path(x);
    }).toThrow();
  });

  it('should allow empty path', function () {
    var p = new Path('fs:');
    expect(p).toBeDefined();
    expect(p.isValid).toBe(true);
  });

  it('should allow root path', function () {
    var p = new Path('fs:/');
    expect(p).toBeDefined();
    expect(p.isValid).toBe(true);
    expect(p.elements).toEqual([]);
  });

  it('should return null for parent of root path', function () {
    var p = new Path('fs:/').getParentPath();
    expect(p).toBe(null);
  });

  it('should split path with multiple elements', function () {
    var p = new Path('fs:foo/bar');
    expect(p).toBeDefined();
    expect(p.isValid).toBe(true);
    expect(p.elements).toEqual(['foo', 'bar']);
  });

  it('should split path with multiple elements', function () {
    var p = new Path('fs:/foo/bar');
    expect(p).toBeDefined();
    expect(p.isValid).toBe(true);
    expect(p.elements).toEqual(['foo', 'bar']);
  });

  it('should return the base name as a string', function () {
    var p = new Path('fs:/foo/bar/blah').getBaseName();
    expect(p).toBeDefined();
    expect(p).toEqual('blah');
  });

  it('should combine root with simple relative paths', function () {
    var p = new Path('fs:').combine('foo');
    expect(p).toBeDefined();
    expect(p.spec).toEqual('fs:/foo');
  });

  it('should combine simple relative paths', function () {
    var p = new Path('fs:bar').combine('foo');
    expect(p).toBeDefined();
    expect(p.spec).toEqual('fs:/bar/foo');
  });

  it('should combine dotted relative paths', function () {
    var p = new Path('fs:bar').combine('./foo');
    expect(p).toBeDefined();
    expect(p.spec).toEqual('fs:/bar/foo');
  });

  it('should combine dotted relative paths', function () {
    var p = new Path('fs:bar').combine('../foo');
    expect(p).toBeDefined();
    expect(p.spec).toEqual('fs:/foo');
  });

  it('should resolve paths relative to current fs', function () {
    var p = Path.abs('fs:bar', '/foo');
    expect(p).toBeDefined();
    expect(p.spec).toEqual('fs:/foo');
  });
});
