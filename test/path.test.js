var require = __axiomRequire__;

var failTest = function(error) {
  expect(error).toBeUndefined();
};

describe('Path', function () {
  var Path;
  beforeEach(function () {
    var module = require('axiom/fs/path');
    expect(module).toBeDefined();
    Path = module.Path;
  });

  afterEach(function () {
    Path = undefined;
  });

  it('should be available as a module', function () {
    expect(Path).toBeDefined();
  });

  it('should not allow undefined path', function () {
    expect(function() { var p = new Path(); }).toThrow();
  });

  it('should allow empty path', function () {
    var p = new Path('');
    expect(p).toBeDefined();
    expect(p.isValid).toBe(true);
  });

  it('should allow root path', function () {
    var p = new Path('/');
    expect(p).toBeDefined();
    expect(p.isValid).toBe(true);
    expect(p.elements).toEqual([]);
  });

  it('should return null for parent of root path', function () {
    var p = new Path('/').getParentPath();
    expect(p).toBe(null);
    pending();
  });

  it('should split path with multiple elements', function () {
    var p = new Path('foo/bar');
    expect(p).toBeDefined();
    expect(p.isValid).toBe(true);
    expect(p.elements).toEqual(['foo', 'bar']);
  });

  it('should split path with multiple elements', function () {
    var p = new Path('/foo/bar');
    expect(p).toBeDefined();
    expect(p.isValid).toBe(true);
    expect(p.elements).toEqual(['foo', 'bar']);
  });

  it('should return the base name as a string', function () {
    var p = new Path('/foo/bar/blah').getBaseName();
    expect(p).toBeDefined();
    expect(p).toEqual('blah');
  });
});
