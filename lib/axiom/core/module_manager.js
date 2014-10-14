// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SemVer from 'semver';

import Err from 'axiom/core/err';
import Module from 'axiom/core/module';
import ServiceManager from 'axiom/core/service_manager';

export var ModuleManager = function() {
  // The registry of modules, keyed by module id.
  this.modules_ = {};
  this.serviceManager = new ServiceManager();
};

export default ModuleManager;

/**
 * Define a new implementation.
 *
 * TODO: Check deps, extend other implementations.
 *
 * @param {Object} desc An implementation descriptor.
 * @return {Promise<Module>}
 */
ModuleManager.prototype.defineModule = function(descriptor) {
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

    if (id in this.modules_) {
      reject(new Err.Duplicate('module-id', id));
      return;
    }

    var module = new Module(this, descriptor);
    this.modules_[id] = module;

    resolve(module);
  }.bind(this));
};

/**
 * Return a Module for the given dependency expression.
 *
 * @param {string} dependencyExpr A module id and version number
 *   specified as "foo-module>=1.0.0".  See the node-semver module for
 *   documentation on the comparison operators.
 * @return {Promise<Module>}
 */
ModuleManager.prototype.getModule = function(dependencyExpr) {
  return new Promise(function (resolve, reject) {
    var ary = /([\w\d-_]+)(.*)/;
    if (!ary) {
      reject(new Err.Invalid('dependency-expr', dependencyExpr));
      return;
    }

    var id = ary[1];
    var expr = ary[2];

    var module = this.modules_[id];
    if (!module) {
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

    // NB: Only one version of a module may be loaded.
    if (!range.test(module.semver)) {
      reject(new Err.Incompatible('dependency-expr', dependencyExpr));
      return;
    }

    resolve(module);
  }.bind(this));
};
