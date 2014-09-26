// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SemVer from 'semver';
import Implementation from 'axiom/implementation';
import Err from 'axiom/err';

export var Loader = function() {
  // The registry of implementations, keyed by implementation id.
  this.implementations_ = {};
};

export default Loader;

/**
 * Define a new implementation.
 *
 * TODO: Check deps, extend other implementations.
 *
 * @param {Object} desc An implementation descriptor.
 * @return {Promise<Implementation>}
 */
Loader.prototype.define = function(descriptor) {
  return new Promise(function(resolve, reject) {
    var id = descriptor.id;

    if (!id) {
      reject(new Err.Missing('id', id));
      return;
    }

    if (!descriptor.version) {
      reject(new Err.Missing('version'));
      return;
    }

    if (!SemVer.valid(descriptor.version)) {
      reject(new Err.Invalid('version', descriptor.version));
      return;
    }

    if (id in this.implementations_) {
      reject(new Err.Duplicate('id', id));
      return;
    }

    var impl = new Implementation(descriptor);
    this.implementation_[id] = impl;
    resolve(impl);
  });
};

/**
 * Return a descriptor for the given dependency expression.
 *
 * @param {string} dependencyExpr An implementation id and version number
 *   specified as "foo-package>=1.0.0".  See the node-semver package for
 *   documentation on the comparison operators.
 * @return {Promise<Implementation>}
 */
Loader.prototype.findImplementation = function(dependencyExpr) {
  return new Promise(function (resolve, reject) {
    var ary = /([\w\d-_]+)(.*)/;
    if (!ary) {
      reject(new Err.Invalid('dependencyExpr', dependencyExpr));
      return;
    }

    var id = ary[1];
    var expr = ary[2];

    var impl = this.implementations_[id];
    if (!impl) {
      reject(new Err.NotFound('id', id));
      return;
    }

    var range;
    try {
      range = new SemVer.Range(expr);
    } catch (ex) {
      reject(new Err.Invalid('range', expr));
      return;
    }

    // NB: Only one version of an implementation may be loaded.
    if (!range.test(impl.semver)) {
      reject(new Err.Incompatible('dependency', dependencyExpr));
      return;
    }

    resolve(impl);
  });
};
