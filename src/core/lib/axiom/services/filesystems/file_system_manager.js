// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import Path from 'axiom/fs/path';
import FileSystemBinding from 'axiom/bindings/fs/file_system';
import DomFileSystem from 'axiom/fs/dom_file_system';
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

  serviceBinding.bind(this.jsfs_.binding, {
    'readFile' : 'readFile',
    'writeFile' : 'writeFile'
  });

  serviceBinding.ready();
};

/**
 * Mounts a given type if dom filesystem at /jsDir/mountName
 *
 * @param type temporary or permanent dom filesystem.
 * @param mountName
 */
FileSystemManager.prototype.mountDomfs = function(type, mountName, jsDir) {
  var requestFs = window.requestFileSystem || window.webkitRequestFileSystem;
  // This is currently ignored.
  var capacity = 1024 * 1024 * 1024;

  var onFileSystemFound = function(jsDir, fs) {
    var domfs = new DomFileSystem(fs);
    jsDir.mount(mountName, domfs.binding);
  }.bind(null, jsDir);

  var onFileSystemError = function(e) {
    throw new AxiomError.Runtime(e);
  };

  if (type == 'temporary') {
    navigator.webkitTemporaryStorage.requestQuota(capacity, function(bytes) {
      requestFs(window.TEMPORARY, bytes, onFileSystemFound, onFileSystemError);
    });
  } else {
    navigator.webkitPersistentStorage.requestQuota(capacity, function(bytes) {
      requestFs(window.PERSISTENT, bytes, onFileSystemFound, onFileSystemError);
    });
  }
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

  this.jsfs_.rootDirectory.mount(sourceModuleId, fsb);
  this.jsfs_.mkdir('mnt').then(function(mntDir) {
    this.mountDomfs('persistent', 'html5', mntDir);
    this.mountDomfs('temporary', 'tmp', this.jsfs_.rootDirectory);
  }.bind(this));
};
