// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import SpawnNacl from 'axiom_pnacl/spawn_nacl';

import AxiomError from 'axiom/core/error';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

// @return {Promise<ArrayBuffer>}
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

// @return {Promise<DirectoryEntry>}
var createDir = function(rootDirEntry, folders) {
  return new Promise(function(resolve, reject) {
    // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
    if (folders[0] === '.' || folders[0] === '') {
      folders = folders.slice(1);
    }
    if (folders.length === 0) {
      resolve(rootDirEntry);
    }
    rootDirEntry.getDirectory(folders[0], { create: true },
      function(dirEntry) {
        // Recursively add the new subfolder (if we still have another to create).
        if (folders.length === 0) {
          resolve(dirEntry);
        }

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

// @return {Promise<>}
var copyUrToFileSystem = function(url, directoryName, fs) {
  return new Promise(function(resolve, reject) {
    var filenameIndex = url.lastIndexOf('/');
    if (filenameIndex < 0) {
      reject(new AxiomError.Runtime('URL does not contain a "/" character.'));
    }
    var filename = url.substr(filenameIndex + 1);
    var path = directoryName + '/' + filename;

    createDir(fs.root, directoryName.split('/')).then(function(dirEntry) {
      dirEntry.getFile(filename, { create: true }, function(fileEntry) {
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
            var blob = new Blob([arrayBuffer], { type: 'application/x-tar; charset=utf-8' });
            fileWriter.write(blob);
          },
          function(e) {
            reject(e);
          });
        }).catch(function(e) {
            reject(e);
        });
      },
      function(e) {
        reject(e);
      });
    }).catch(function(e) {
      reject(e);
    });
  });
};

// @return {Promise<>}
var copyUrlToTemporaryStorage = function(cx, url, directoryName) {
  return new Promise(function(resolve, reject) {
    cx.stdout('Downloading ' + url + ' to file system.');
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
  }).then(function() {
    cx.stdout(' Done.\n');
    return;
  });
};

/**
 * Creates a command that invokes a PNaCl executable.
 * @param {String} commandName The name of the PNaCl command, without
 *   extension (e.g. "vim").
 * @param {String} sourceUrl The Url of the extesion.
 * @param {String} tarFilename Optional name of the tar file associated to
 *   the PNaCl command (e.g. "vim.tar").
 */
export var PnaclCommand = function(commandName, sourceUrl, tarFilename) {
  this.commandName = commandName;
  this.tarFilename = tarFilename;
  this.sourceUrl = sourceUrl;
  var index = sourceUrl.lastIndexOf('/');
  if (index == sourceUrl.length - 1)
    this.baseUrl = this.sourceUrl;
  else
    this.baseUrl = this.sourceUrl(0, index + 1);
};

PnaclCommand.prototype.run = function(cx) {
  return new Promise(function(resolve, reject) {
    // SpawnNacl notifies ok/error completion on the execution context.
    cx.onClose.listenOnce(function(reason, value) {
      if (reason === 'ok') {
        resolve(value);
      } else {
        reject(value);
      }
    }.bind(this));
    cx.ready();

    // If no tar file, run the command right away.
    if (!this.tarFilename) {
      this.runPnacl(cx);
      return;
    }

    // TODO(rpaquay): We copy the tar file into the the temporary DOM
    // filesystem (under 'pnacl') and then pass '/tmp/pnacl/<cmd>.nmf' to
    // <cmd> so that '/tmp/pnacl/<cmd>.tar' will be opened at startup.
    // See https://chromium.googlesource.com/external/naclports.git/+/master/ports/nacl-spawn/nacl_startup_untar.c
    var tarUrl = this.baseUrl + 'pnacl/' + this.tarFilename;
    copyUrlToTemporaryStorage(cx, tarUrl, 'pnacl').then(function() {
      this.runPnacl(cx);
    }.bind(this)).catch(function(e) {
      reject(e);
    });
  }.bind(this));
};

// Creates and runs the pnacl executable.
PnaclCommand.prototype.runPnacl = function(cx) {
  var nmfUrl = this.baseUrl + 'pnacl/' + this.commandName + '.nmf';
  var nmfFile = '/tmp/pnacl/' + this.commandName + '.nmf';
  var nacl = new SpawnNacl('application/x-pnacl', nmfUrl, nmfFile, cx);
  nacl.run();
};

export default PnaclCommand;
