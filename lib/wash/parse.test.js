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
    var p = new Parse('--bool');
    var args = p.parseArgs({ 'bool': '?', 'bool2': '?' });
    expect(args.getValue('bool', false)).toBe(true);
    expect(args.getValue('bool2', null)).toBe(null);

    p = new Parse('--no-bool');
    args = p.parseArgs({ 'bool': '?', 'bool2': '?'});
    expect(args.getValue('bool', true)).toBe(false);
    expect(args.getValue('bool2', null)).toBe(null);

    p = new Parse('--bool --no-bool2');
    args = p.parseArgs({ 'bool': '?', 'bool2': '?'});
    expect(args.getValue('bool', false)).toBe(true);
    expect(args.getValue('bool2', true)).toBe(false);

    p = new Parse('--no-bool --bool2');
    args = p.parseArgs({ 'bool': '?', 'bool2': '?'});
    expect(args.getValue('bool', true)).toBe(false);
    expect(args.getValue('bool2', false)).toBe(true);
  });

  it('should parse short args', function() {
    var p = new Parse('-s foo');
    var args = p.parseArgs({ 'str|s': '$' });
    expect(args.getValue('str')).toBe('foo');
  });

  it('should parse bare string args', function() {
    var p = new Parse('--str foo');
    var args = p.parseArgs({ 'str': '$', str2: '$' });
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('str2', null)).toBe(null);

    p = new Parse('--str foo --str2 bar');
    args = p.parseArgs({ 'str': '$', str2: '$' });
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('str2')).toBe('bar');
  });

  it('should parse double-quote string args', function() {
    var p = new Parse('--str "foo bar"');
    var args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe('foo bar');

    p = new Parse('--str "\\"foo\\" bar"');
    args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe('"foo" bar');

    p = new Parse('--str "foo \\"bar\\""');
    args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe('foo "bar"');

    // Unterminated string should fail.
    p = new Parse('--str " foo bar');
    try {
      args = p.parseArgs({ 'str': '$' });
    } catch (ex) {
      expect(ex.errorName).toBe('Parse');
    }
  });

  it('should parse escapes in double-quoted strings', function() {
    var p = new Parse('--str " \\" \\\' \\\\ \\a \\b \\e \\f \\n \\r \\t \\v"');
    var args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe(
        ' \" \' \\ \x07 \x08 \x1b \x0c \x0a \x0d \x09 \x0b');

    p = new Parse('--str "\\x01 \\x55 \\xaa \\xBB \\xFF"');
    args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe('\x01 \x55 \xaa \xbb \xff');

    p = new Parse('--str "\\u0000 \\u1234 \\uaaaa \\uBBBB \\uFFFF"');
    args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe('\x00 \u1234 \uaaaa \ubbbb \uffff');

  });

  it('should parse single-quote string args', function() {
    var p = new Parse('--str \'foo bar\'');
    var args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe('foo bar');

    p = new Parse('--str \'\\"foo\\" bar\'');
    args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe('\\"foo\\" bar');

    p = new Parse('--str \'foo \\"bar\\"\'');
    args = p.parseArgs({ 'str': '$' });
    expect(args.getValue('str')).toBe('foo \\"bar\\"');

    // Unterminated string should fail.
    p = new Parse('--str \' foo bar');
    try {
      args = p.parseArgs({ 'str': '$' });
    } catch (ex) {
      expect(ex.errorName).toBe('Parse');
    }
  });

  it('should ignore extra whitespace', function() {
    var p = new Parse('--str foo --bool');
    var args = p.parseArgs({ 'str': '$', 'bool': '?' });
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('bool')).toBe(true);

    p = new Parse('    --str     "foo"     --bool    ');
    args = p.parseArgs({ 'str': '$', 'bool': '?' });
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('bool')).toBe(true);

    p = new Parse('     --bool    --str     "foo"    ');
    args = p.parseArgs({ 'str': '$', 'bool': '?' });
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('bool')).toBe(true);

    p = new Parse('    --str     "  foo  "     --bool    ');
    args = p.parseArgs({ 'str': '$', 'bool': '?' });
    expect(args.getValue('str')).toBe('  foo  ');
    expect(args.getValue('bool')).toBe(true);

    p = new Parse('     --bool    --str     "  foo  "    ');
    args = p.parseArgs({ 'str': '$', 'bool': '?' });
    expect(args.getValue('str')).toBe('  foo  ');
    expect(args.getValue('bool')).toBe(true);
  });

  it('should parse array args', function() {
    var p = new Parse('--ary [foo]');
    var args = p.parseArgs({ 'ary': '@' });
    expect(args.getValue('ary')).toEqual(['foo']);

    p = new Parse('--ary []');
    args = p.parseArgs({ 'ary': '@' });
    expect(args.getValue('ary')).toEqual([]);

    p = new Parse('--ary [foo, bar]');
    args = p.parseArgs({ 'ary': '@' });
    expect(args.getValue('ary')).toEqual(['foo', 'bar']);

    p = new Parse('--ary [\'foo\', "bar"]');
    args = p.parseArgs({ 'ary': '@' });
    expect(args.getValue('ary')).toEqual(['foo', 'bar']);

    p = new Parse('--ary ["foo", bar]');
    args = p.parseArgs({ 'ary': '@' });
    expect(args.getValue('ary')).toEqual(['foo', 'bar']);
  });

  it('should parse object args', function() {
    var p = new Parse('--obj {foo: 1}');
    var args = p.parseArgs({ 'obj': '%' });
    expect(args.getValue('obj')).toEqual({foo: '1'});

    p = new Parse('--obj {}');
    args = p.parseArgs({ 'obj': '%' });
    expect(args.getValue('obj')).toEqual({});

    p = new Parse('--obj {foo: 1, bar: 2}');
    args = p.parseArgs({ 'obj': '%' });
    expect(args.getValue('obj')).toEqual({foo: '1', bar: '2'});

    p = new Parse('--obj {foo:1,bar:2}');
    args = p.parseArgs({ 'obj': '%' });
    expect(args.getValue('obj')).toEqual({foo: '1', bar: '2'});

    p = new Parse('--obj {foo    : 1   ,    bar: 2}');
    args = p.parseArgs({ 'obj': '%' });
    expect(args.getValue('obj')).toEqual({foo: '1', bar: '2'});

    p = new Parse('--obj {foo:1,    bar   :     2      }');
    args = p.parseArgs({ 'obj': '%' });
    expect(args.getValue('obj')).toEqual({foo: '1', bar: '2'});

    p = new Parse('--obj {\'foo\': \'1\', "bar": "2"}');
    args = p.parseArgs({ 'obj': '%' });
    expect(args.getValue('obj')).toEqual({foo: '1', bar: '2'});

    p = new Parse('--obj {"foo": "1", \'bar\': \'2\'}');
    args = p.parseArgs({ 'obj': '%' });
    expect(args.getValue('obj')).toEqual({foo: '1', bar: '2'});
  });

  it('should handle value args', function() {
    var p = new Parse('--val {foo: 1}');
    var args = p.parseArgs({ 'val': '*' });
    expect(args.getValue('val')).toEqual({foo: '1'});

    p = new Parse('--val [1,2,3]');
    args = p.parseArgs({ 'val': '*' });
    expect(args.getValue('val')).toEqual(['1', '2', '3']);

    p = new Parse('--val hello');
    args = p.parseArgs({ 'val': '*' });
    expect(args.getValue('val')).toEqual('hello');

    p = new Parse('--val {}');
    args = p.parseArgs({ 'val': '*' });
    expect(args.getValue('val')).toEqual({});

    p = new Parse('--val []');
    args = p.parseArgs({ 'val': '*' });
    expect(args.getValue('val')).toEqual([]);
  });

  it('should handle complex args', function() {
    var p = new Parse('--val {foo: [1,2,3], "bar": {"a": "x", y: z}}');
    var args = p.parseArgs({'val': '*'});
    expect(args.getValue('val')).toEqual({foo: ['1', '2', '3'],
                                          bar: {a: 'x', y: 'z'}});

    p = new Parse('--val [{}, {a: 1, b: 2}, []]');
    args = p.parseArgs({'val': '*'});
    expect(args.getValue('val')).toEqual([{}, {a: '1', b: '2'}, []]);
  });

  it('should handle loose array', function() {
    var p = new Parse('x y z');
    var args = p.parseArgs({ '_': '@'});
    expect(args.getValue('_')).toEqual(['x', 'y', 'z']);

    p = new Parse('--str foo --bool x y z');
    args = p.parseArgs({ 'str': '$', 'bool': '?', '_': '@'});
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('bool')).toBe(true);
    expect(args.getValue('_')).toEqual(['x', 'y', 'z']);

    p = new Parse('x y z --str foo --bool');
    args = p.parseArgs({ 'str': '$', 'bool': '?', '_': '@'});
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('bool')).toBe(true);
    expect(args.getValue('_')).toEqual(['x', 'y', 'z']);

    p = new Parse('--str foo x y z --bool');
    args = p.parseArgs({ 'str': '$', 'bool': '?', '_': '@'});
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('bool')).toBe(true);
    expect(args.getValue('_')).toEqual(['x', 'y', 'z']);

    p = new Parse('x --str foo y --bool z');
    args = p.parseArgs({ 'str': '$', 'bool': '?', '_': '@'});
    expect(args.getValue('str')).toBe('foo');
    expect(args.getValue('bool')).toBe(true);
    expect(args.getValue('_')).toEqual(['x', 'y', 'z']);
  });

});
