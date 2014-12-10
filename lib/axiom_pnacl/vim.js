// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SpawnNacl from 'axiom_pnacl/spawn_nacl';

import AxiomError from 'axiom/core/error';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

var downloadBinaryFile = function(url) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.onload = function(e) {
      var arraybuffer = request.response; // not responseText
      resolve(arraybuffer);
    };
    request.onerror = function(e) {
      reject(e);
    };
    request.onabort = function(e) {
      reject(e);
    };
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.send();
  });
};

var createDir = function(rootDirEntry, folders) {
  return new Promise(function(resolve, reject) {
    // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
    if (folders[0] === '.' || folders[0] === '') {
      folders = folders.slice(1);
    }
    rootDirEntry.getDirectory(folders[0], { create: true },
      function(dirEntry) {
        // Recursively add the new subfolder (if we still have another to create).
        if (folders.length === 0)
          resolve(dirEntry);

        createDir(dirEntry, folders.slice(1)).then(function(dirEntry) {
          resolve(dirEntry);
        }).catch(function(e) {
          reject(e);
        });
      },
      function(e) {
        reject(e);
      });
  });
};

var copyUrToFileSystem = function(url, directoryName, fs) {
  return new Promise(function(resolve, reject) {
    var filenameIndex = url.lastIndexOf('/');
    if (filenameIndex < 0) {
      reject(new AxiomError.Runtime('URL does not contain a "/" character.'));
    }
    var filename = url.substr(filenameIndex + 1);
    var path = directoryName + '/' + filename;

    createDir(fs.root, directoryName.split('/')).then(function(dirEntry) {
      dirEntry.getFile(filename, { create: true },
        function(fileEntry) {
          downloadBinaryFile(url).then(function(arrayBuffer) {
              fileEntry.createWriter(function(fileWriter) {
                  fileWriter.onwriteend = function(e) {
                    console.log('Write completed.');
                    resolve();
                  };
                  fileWriter.onerror = function(e) {
                    console.log('Write failed: ' + e.toString());
                    reject(e);
                  };
                  // Create a new Blob and write it to log.txt.
                  var blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
                  fileWriter.write(blob);
                },
                function(e) {
                  reject(e);
                });
            },
            function(e) {
              reject(e);
            });
        });
    }).catch(function(e) {
      reject(e);
    });
  });
};

var copyUrlToTemporaryStorage = function(url, directoryName) {
  return new Promise(function(resolve, reject) {
    // Note: The file system has been prefixed as of Google Chrome 12:
    window.requestFileSystem =
      window.requestFileSystem || window.webkitRequestFileSystem;

    window.requestFileSystem(window.TEMPORARAY, 10 * 1024 * 1024,
      function(fs) {
        resolve(fs);
      },
      function(e) {
        reject(e);
      });
  }).then(function(fs) {
    return copyUrToFileSystem(url, directoryName, fs);
  });
};

/**
 * Invokes the vim editor.
 */
export var VimCommand = function(sourceUrl) {
  this.sourceUrl = sourceUrl;
};

VimCommand.prototype.run = function(cx) {
  return new Promise(function(resolve, reject) {
    // SpawnNacl notifies ok/error completion on the execution context.
    cx.onClose.listenOnce(function(reason, value) {
      if (reason === 'ok') {
        resolve(value);
      } else {
        reject(value);
      }
    }.bind(this));

    // TODO(rpaquay): Cleaner URL handling.
    var tarUrl = this.sourceUrl.replace('/import.html', '/pnacl/vim.tar');

    copyUrlToTemporaryStorage(tarUrl, 'pnacl').then(function() {
      // TODO(rpaquay): Cleaner URL handling.
      var url = this.sourceUrl;
      url = url.replace('/import.html', '/pnacl/vim.nmf');

      // Execute pnacl vim.
      var nacl = new SpawnNacl('application/x-pnacl', url, cx);
      nacl.run();
    }.bind(this));
  }.bind(this));
};

export default VimCommand;
