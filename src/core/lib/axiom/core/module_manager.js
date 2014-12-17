// Copyright 2014 Google Inc. All rights reserved.
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

import SemVer from 'semver';
import AxiomError from 'axiom/core/error';
import ModuleBinding from 'axiom/bindings/module';

/**
 * @constructor
 */
export var ModuleManager = function() {
  // The registry of modules, keyed by module id.
  this.moduleBindings_ = new Map();
};

export default ModuleManager;

/**
 * Define a new implementation.
 *
 * TODO: Check deps.
 *
 * @param {Object} descriptor The module's descriptor.
 * @return {ModuleBinding}
 */
ModuleManager.prototype.defineModule = function(descriptor) {
  var moduleBinding = new ModuleBinding(this, descriptor);

  if (this.moduleBindings_.has(moduleBinding.moduleId))
    throw new AxiomError.Duplicate('module-id', moduleBinding.moduleId);
  if (!SemVer.valid(moduleBinding.version))
    throw new AxiomError.Invalid('version', moduleBinding.version);

  this.moduleBindings_.set(moduleBinding.moduleId, moduleBinding);

  return moduleBinding;
};

/**
 * Return a ModuleBinding for the given dependency expression.
 *
 * @param {string} dependencyExpr A module id and version number
 *   specified as "foo-module>=1.0.0".  See the node-semver module for
 *   documentation on the comparison operators.
 */
ModuleManager.prototype.getModuleBinding = function(dependencyExpr) {
  var ary = /([\w\d-_]+)(.*)/.exec(dependencyExpr);
  if (!ary)
    throw new AxiomError.Invalid('dependency-expr', dependencyExpr);

  var moduleId = ary[1];
  var expr = ary[2];

  var moduleBinding = this.moduleBindings_.get(moduleId);
  if (!moduleBinding)
    throw new AxiomError.NotFound('module-id', moduleId);

  if (expr) {
    var range;
    try {
      range = new SemVer.Range(expr);
    } catch (ex) {
      throw new AxiomError.Invalid('range', expr);
    }

    // NB: Only one version of a module may be loaded.
    if (!range.test(moduleBinding.version))
      throw new AxiomError.Incompatible('dependency-expr', dependencyExpr);
  }

  return moduleBinding;
};

/**
 * @param {string} moduleServiceId  String of the form "serviceName@moduleName".
 */
ModuleManager.prototype.getServiceBinding = function(moduleServiceId) {
  var ary = moduleServiceId.split('@');
  if (ary.length != 2)
    throw new AxiomError.Invalid('module-service-id', moduleServiceId);

  var moduleBinding = this.getModuleBinding(ary[1]);
  return moduleBinding.getServiceBinding(ary[0]);
};
