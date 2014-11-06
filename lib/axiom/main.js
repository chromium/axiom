// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import ModuleManager from 'axiom/core/module_manager';

import FileSystemManager from 'axiom/services/filesystems/file_system_manager';
import CommandManager from 'axiom/services/commands/command_manager';
import WindowManager from 'axiom/services/views/window_manager';
import PreferenceManager from 'axiom/services/preferences/preference_manager';
import ViewManager from 'axiom/services/views/view_manager';

import axiomDescriptor from 'axiom/descriptor';

export var main = function() {
  var moduleManager = new ModuleManager();
  window.mm_ = moduleManager;

  var axiomModule = moduleManager.defineModule(axiomDescriptor);

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
  }

  return Promise.resolve(moduleManager);
};

export default main;
