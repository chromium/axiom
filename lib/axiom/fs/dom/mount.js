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

import DomFileSystem from 'axiom/fs/dom/file_system';
import AxiomError from 'axiom/core/error';
import JsDirectory from 'axiom/fs/js/directory';

export var domMount = {};

domMount.available = function() {
  return !!(window.requestFileSystem || window.webkitRequestFileSystem);
}

/**
 * Mounts a given type if dom filesystem at /jsDir/mountName
 *
 * @param {string} type temporary or permanent dom filesystem.
 * @param {string} mountName
 * @param {JsDirectory} jsDir
 * @return {Promise<DomFileSystem>}
 */
domMount.mount = function(type, mountName, jsDir) {
  return new Promise(function(resolve, reject) {
    if (!window.requestFileSystem && !window.webkitRequestFileSystem) {
      return resolve(null);
    }
    var requestFs = (window.requestFileSystem ||
                     window.webkitRequestFileSystem).bind(window);

    // This is currently ignored.
    var capacity = 1024 * 1024 * 1024;

    var onFileSystemFound = function(fs) {
      var domfs = new DomFileSystem(fs);
      jsDir.mount(mountName, domfs);
      resolve(domfs);
    };

    var onFileSystemError = function(e) {
      reject(new AxiomError.Runtime(e));
    };

    if (type == 'temporary') {
      var pemporaryStorage = navigator['webkitTemporaryStorage'];
      pemporaryStorage.requestQuota(capacity, function(bytes) {
          requestFs(window.TEMPORARY, bytes,
                    onFileSystemFound, onFileSystemError);
        });
    } else {
      var persistentStorage = navigator['webkitPersistentStorage'];
      persistentStorage.requestQuota(capacity, function(bytes) {
          requestFs(window.PERSISTENT, bytes,
                    onFileSystemFound, onFileSystemError);
        });
    }
  });
};

export default domMount;
