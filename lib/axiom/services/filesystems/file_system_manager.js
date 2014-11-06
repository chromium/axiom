// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Path from 'axiom/fs/path';
import FileSystemBinding from 'axiom/bindings/fs/file_system';
import JsFileSystem from 'axiom/fs/js_file_system';

/**
 * Registry of filesystems.
 */
export var FileSystemManager = function() {
  this.extensionBindings_ = [];
  this.jsfs_ = new JsFileSystem();
};

export default FileSystemManager;

/**
 * @param {ServiceBinding} serviceBinding
 */
FileSystemManager.prototype.bind = function(serviceBinding) {
  serviceBinding.bind(this, {
    'onExtend': 'onExtend'
  });

  serviceBinding.bind(this.jsfs_, {
    'createContext': 'createContext',
    'list': 'list',
    'mkdir': 'mkdir',
    'stat': 'stat',
    'unlink': 'unlink'
  });

  serviceBinding.ready();
};

/**
 * Extending the FileSystemManager adds to the list of known filesystems.
 *
 * The extension descriptor should enumerate the filesystem names to be added,
 * and the binding should provide a 'get' function which takes (name) and
 * returns a promise to the requested filesystem.
 *
 * @param {ExtensionBinding} extension
 */
FileSystemManager.prototype.onExtend = function(extensionBinding) {
  var sourceModuleId = extensionBinding.sourceModuleBinding.moduleId;

  var fsb = new FileSystemBinding();
  fsb.bind(extensionBinding, {
    'createContext': 'createContext',
    'list': 'list',
    'mkdir': 'mkdir',
    'stat': 'stat',
    'unlink': 'unlink'
  });

  fsb.dependsOn(extensionBinding);
  fsb.ready();

  this.jsfs_.rootDirectory.linkFileSystem(sourceModuleId, fsb);
};
