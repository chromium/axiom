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


  this.mountDomfs('temporary', 'tmp', this.jsfs_.rootDirectory).then(
    function () {
      return this.jsfs_.mkdir('mnt');
    }.bind(this)
  ).then(function(mntDir) {
    return this.mountDomfs('persistent', 'html5', mntDir);
  }.bind(this)).then(function(domfs) {
    return domfs.mkdir('home');
  }).then(function() {
    serviceBinding.ready();
  }).catch(function(error) {
    console.log('error mounting domfs', error);
    serviceBinding.ready();
  });
};

/**
 * Mounts a given type if dom filesystem at /jsDir/mountName
 *
 * @param type temporary or permanent dom filesystem.
 * @param mountName
 */
FileSystemManager.prototype.mountDomfs = function(type, mountName, jsDir) {
  return new Promise(function(resolve, reject) {
    var requestFs = (window.requestFileSystem ||
                     window.webkitRequestFileSystem);
    // This is currently ignored.
    var capacity = 1024 * 1024 * 1024;

    var onFileSystemFound = function(fs) {
      var domfs = new DomFileSystem(fs);
      jsDir.mount(mountName, domfs.binding);
      resolve(domfs);
    };

    var onFileSystemError = function(e) {
      reject(new AxiomError.Runtime(e));
    };

    if (type == 'temporary') {
      navigator.webkitTemporaryStorage.requestQuota(capacity, function(bytes) {
          requestFs(window.TEMPORARY, bytes,
                    onFileSystemFound, onFileSystemError);
        });
    } else {
      navigator.webkitPersistentStorage.requestQuota(capacity, function(bytes) {
          requestFs(window.PERSISTENT, bytes,
                    onFileSystemFound, onFileSystemError);
        });
    }
  });
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
};
