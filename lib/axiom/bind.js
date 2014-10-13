// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import ServiceManager from 'axiom/core/service_manager';

import FileSystemManager from 'axiom/runtime/filesystems/filesystem_manager';
import CommandManager from 'axiom/runtime/commands/command_manager';
import WindowManager from 'axiom/runtime/views/window_manager';
import PreferenceManager from 'axiom/runtime/preferences/preference_manager';
import ViewManager from 'axiom/runtime/views/view_manager';

export var bind = function(module) {
  var serviceDefs = [
    ['filesystems', FileSystemManager],
    ['commands', CommandManager],
    ['windows', WindowManager],
    ['prefs', PreferenceManager],
    ['views', ViewManager]
  ];

  var serviceManager = module.serviceManager;

  var bindService = function(serviceDef) {
    var manager = new serviceDef[1]();
    serviceManager.bindService(serviceDef[0], {
      get: function() {
        return Promise.resolve(manager);
      },
      extend: function(extension) {
        return Promise.resolve(manager.extend(extension));
      }
    });
  };

  for (var i = 0; i < serviceDefs.length; i++) {
    bindService(serviceDefs[i]);
  }
};

export default bind;
