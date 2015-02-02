var require = __axiomRequire__;

var failTest = function(error) {
  expect(error).toBeUndefined();
};

describe('JsFileSystem', function () {
  var fs;

  beforeEach(function() {
    var fsModule = require('axiom/fs/js_file_system');
    if (fsModule)
      fs = new fsModule.JsFileSystem();
  });

  afterEach(function() {
    fs = undefined;
  });

  it('should be available as a module', function () {
    expect(fs).toBeDefined();
  });

  it('should have a root directry', function () {
      expect(fs.rootDirectory).toBeDefined();
  });

  describe('when empty', function () {
    it('should have a root folder', function(done) {
      fs.stat().then(function (rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(8);
          expect(rv.count).toBe(0);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have a root folder named "/"', function(done) {
      fs.stat('/').then(function(rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(8);
          expect(rv.count).toBe(0);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have no entries when created', function(done) {
      fs.list('/').then(function (entries) {
          expect(entries).toEqual({});
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow creation of a directory', function (done) {
        fs.rootDirectory.mkdir('foo').then(function (dir) {
          expect(dir).toBeDefined();
          expect(dir.mode).toBe(8);
        })
        .catch(failTest)
        .then(done);
    });
  });

  describe('when populated', function() {
    beforeEach(function (done) {
        fs.rootDirectory.mkdir('foo')
        .then(function (dir) {
          return dir.mkdir('bar');
        })
        .catch(failTest)
        .then(done);
    });

    afterEach(function (done) {
      fs.list('/')
        .then(function(entries) {
          var unlinks = [];
          for (var e in entries) {
            unlinks.push(fs.unlink(e));
          }
          return Promise.all(unlinks);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have a folder named "foo" with one entry', function (done) {
      fs.stat('foo').then(function(rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(8);
          expect(rv.count).toBe(1);
        })
        .catch(failTest)
        .then(done);
    });

    it('should have a root folder named "foo/bar" with no entries', function (done) {
      fs.stat('foo/bar').then(function(rv) {
          expect(rv).toBeDefined();
          expect(rv.mode).toBe(8);
          expect(rv.count).toBe(0);
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow unlink of folder "foo/bar"', function (done) {
      fs.unlink('foo/bar').then(function() {
        })
        .catch(failTest)
        .then(done);
    });

    it('should allow unlink of folder "foo"', function (done) {
      fs.unlink('foo').then(function() {
        })
        .catch(failTest)
        .then(done);
    });
  });
});
