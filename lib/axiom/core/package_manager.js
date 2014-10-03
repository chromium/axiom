// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SemVer from 'semver';

import Err from 'axiom/core/err';
import Package from 'axiom/core/package';

export var PackageManager = function() {
  // The registry of packages, keyed by package id.
  this.packages_ = {};
};

export default PackageManager;

/**
 * Define a new implementation.
 *
 * TODO: Check deps, extend other implementations.
 *
 * @param {Object} desc An implementation descriptor.
 * @return {Promise<Package>}
 */
PackageManager.prototype.define = function(descriptor) {
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

    if (id in this.packages_) {
      reject(new Err.Duplicate('package-id', id));
      return;
    }

    var package = new Package(descriptor);
    this.packages_[id] = package;
    resolve(package);
  });
};

/**
 * Return a descriptor for the given dependency expression.
 *
 * @param {string} dependencyExpr A package id and version number
 *   specified as "foo-package>=1.0.0".  See the node-semver package for
 *   documentation on the comparison operators.
 * @return {Promise<PAckage>}
 */
PackageManager.prototype.get = function(dependencyExpr) {
  return new Promise(function (resolve, reject) {
    var ary = /([\w\d-_]+)(.*)/;
    if (!ary) {
      reject(new Err.Invalid('dependency-expr', dependencyExpr));
      return;
    }

    var id = ary[1];
    var expr = ary[2];

    var package = this.packages_[id];
    if (!package) {
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

    // NB: Only one version of a package may be loaded.
    if (!range.test(package.semver)) {
      reject(new Err.Incompatible('dependency-expr', dependencyExpr));
      return;
    }

    resolve(package);
  });
};
