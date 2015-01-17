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

import ModuleManager from 'axiom/core/module_manager';

import FileSystemManager from 'axiom/services/filesystems/file_system_manager';
import CommandManager from 'axiom/services/commands/command_manager';
import WindowManager from 'axiom/services/views/window_manager';
import PreferenceManager from 'axiom/services/preferences/preference_manager';
import ViewManager from 'axiom/services/views/view_manager';

import axiomDescriptor from 'axiom/descriptor';

export var main = function() {
  var moduleManager = new ModuleManager();
  // Global objects for js-console based debugging.
  window.g_ = {
    'mm': moduleManager
  };

  var ary = [
      ['filesystems', FileSystemManager],
      ['commands', CommandManager],
      ['windows', WindowManager],
      ['prefs', PreferenceManager],
      ['views', ViewManager]];

  for (var i = 0; i < ary.length; i++) {
    var def = ary[i];
    var serviceBinding = axiomModule.getServiceBinding(def[0]);
    var service = new def[1](moduleManager);
    service.bind(serviceBinding);
    window.g_[def[0]] = service;
  }

  return Promise.resolve(moduleManager);
};

export default main;
