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

/**
 * Global shell environment.
 *
 * After shell is initialized, other modules can use this to get at
 * global state.
 */
var axiomModuleManager;
var __axiomRequire__;

export var environment = {
  setModuleManager: function(mm) {
    axiomModuleManager = mm;
  },

  getServiceBinding: function(name) {
    return axiomModuleManager.getServiceBinding(name);
  },

  defineModule: function(descriptor) {
    return axiomModuleManager.defineModule(descriptor);
  },

  getAxiomModule: function(dependencyExpr) {
    return axiomModuleManager.getModuleBinding(dependencyExpr);
  },

  // TODO(rginda): This is a dynamic es6 module import and has nothing
  // to do with "axiom modules".  We should rename axiom modules to
  // avoid the name collision.
  requireModule: function(name) {
    /* global __axiomRequire__ */
    return __axiomRequire__(name);
  }
};

export default environment;
