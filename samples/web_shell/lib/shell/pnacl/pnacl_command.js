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

import SpawnNacl from 'shell/pnacl/spawn_nacl';

import AxiomError from 'axiom/core/error';
import Path from 'axiom/fs/path';

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
var createDir = function(parentDirEntry, folders) {
  return new Promise(function(resolve, reject) {
    // Throw out './' or '/' and move on to prevent something like
    // '/foo/.//bar'.
    if (folders[0] === '.' || folders[0] === '') {
      folders = folders.slice(1);
    }
    if (folders.length === 0) {
      resolve(parentDirEntry);
      return;
    }
    parentDirEntry.getDirectory(folders[0], { create: true },
      function(childDirEntry) {
        // Recursively add the new subfolder (if we still have another to
        // create).
        createDir(childDirEntry, folders.slice(1)).then(function(newDirEntry) {
          resolve(newDirEntry);
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
              resolve();
            };
            fileWriter.onerror = function(e) {
              reject(e);
            };
            // Create a new Blob and write it to log.txt.
            var blob = new Blob([arrayBuffer], {
                type: 'application/x-tar; charset=utf-8'
            });
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
 * @param {String} name The name of the PNaCl command, without
 *   extension (e.g. "vim").
 * @param {String} nmfUrl The url to the nmf file.
 * @param {String} opt_tarFileUrl Optional url of the tar file associated to
 *   the PNaCl command (e.g. "vim.tar").
 * @param {Object} opt_env Optional enviroment variables to add to the execution
 *   context before running the command.
 */
export var PnaclCommand = function(name, nmfUrl, opt_tarFileUrl, opt_env) {
  this.commandName = name;
  this.nmfUrl = nmfUrl;
  this.tarFileUrl = opt_tarFileUrl;
  this.env = opt_env;
};

PnaclCommand.prototype.install = function(cx) {
  var pnacl = this;
  var pnaclMain = function(pnaclContext) {
    pnaclContext.ready();
    // Apply additional environment variables to [cx]
    if (this.env) {
      for (var key in this.env) {
        pnacalContext.setEnv(key, this.env[key]);
       }
    }
    var nmfFile = '/tmp/pnacl/' + pnacl.commandName + '.nmf';
    var nacl = new SpawnNacl('application/x-pnacl',
        pnacl.nmfUrl, nmfFile, pnaclContext);
    nacl.run();
    return null;
  };

  var jsDir = cx.jsfs.resolve(new Path('/exe')).entry;
  var cmd = {};
  cmd[pnacl.commandName] = pnaclMain;
  jsDir.install(cmd);

  return cx.closeOk();
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

    // TODO(rpaquay): Remove this code (and [copyUrlToTemporaryStorage]) when
    // there is no need to test with naclports builds older than (approximately)
    // pepper41/trunk-223-g26a4b66.

    // If no tar file, run the command right away.
    if (!this.tarFileUrl) {
      return this.install(cx);
    }

    // TODO(rpaquay): We copy the tar file into the the temporary DOM
    // filesystem (under 'pnacl') and then pass '/tmp/pnacl/<cmd>.nmf' to
    // <cmd> so that '/tmp/pnacl/<cmd>.tar' will be opened at startup.
    // See http://goo.gl/Km8YWu
    copyUrlToTemporaryStorage(cx, this.tarFileUrl, 'pnacl').then(function() {
      return this.install(cx);
    }.bind(this)).catch(function(e) {
      reject(e);
    });
  }.bind(this));
};

export default PnaclCommand;
