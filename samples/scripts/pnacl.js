
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

document.currentScript.ready(function(cx) {
  var PNACL_CMD_USAGE_STRING = 'usage: pnacl <name> <url> [tarFileName]';

  var pnaclMain = function(cx) {
    cx.ready();

    var list = cx.getArg('_', []);
      if (list.length < 2 || cx.getArg('help')) {
        cx.stdout(PNACL_CMD_USAGE_STRING + '\n');
        return cx.closeOk();
      }

      var name = list[0];
      var url = list[1];
      var tarFileName = '';

      if (list.length > 2) {
        tarFileName = list[2];
      }

      var pwd = cx.getEnv('$PWD', '/');

      var pnaclCommand = new PnaclCommand(name, url, tarFileName);
      return pnaclCommand.run(cx);
    };

    pnaclMain.signature = {
      'help|h': '?',
      '!_': '@'
    };

  var installPnacl = function(cx) {
    var path = new axiom.fs.path.Path('jsfs:/exe');
    var jsDir = cx.jsfs.resolve(path).entry;
    jsDir.install({
      'pnacl': pnaclMain
    });
  };

  installPnacl(cx);

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

  var copyUrToFileSystem = function(url, directoryName, fs) {
    return new Promise(function(resolve, reject) {
      var filenameIndex = url.lastIndexOf('/');
      if (filenameIndex < 0) {
          reject(new axiom.core.error.AxiomError.Runtime(
            'URL does not contain a "/" character.'));
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

  var copyUrlToTemporaryStorage = function(cx, url, directoryName) {
    return new Promise(function(resolve, reject) {
      cx.stdout('Downloading ' + url + ' to file system.');
      // Note: The file system has been prefixed as of Google Chrome 12:
      window.requestFileSystem =
            window.requestFileSystem || window.webkitRequestFileSystem;

      window.requestFileSystem(window.TEMPORARAY, 10 * 1024 * 1024,
          function(fs) {resolve(fs);}, function(e) {reject(e);});
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
  var PnaclCommand = function(name, nmfUrl, opt_tarFileUrl, opt_env) {
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

    var jsDir = cx.jsfs.resolve(new axiom.fs.path.Path('jsfs:/exe')).entry;
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

  var SpawnNacl = function (mimeType, nmfURL, arg0, executeContext) {
    this.mimeType_ = mimeType;
    this.nmfURL_ = nmfURL;
    this.executeContext = executeContext;
    this.arg0_ = arg0;

    // TODO(rpaquay): We need to know which view we are running in.
    // Make it part of execution context?
    this.document_ = window.document;
    this.posixArgs_ = executeContext.arg;
    if (!(this.posixArgs_ instanceof Array)) {
      this.posixArgs_ = [];
    }
  };

  SpawnNacl.prototype.run = function () {
    var document = this.document_;

    var plugin = document.createElement('object');
    this.plugin_ = plugin;
    plugin.addEventListener('load', this.onPluginLoad_.bind(this));
    plugin.addEventListener('error', this.onPluginLoadError_.bind(this));
    plugin.addEventListener('abort', this.onPluginLoadAbort_.bind(this));
    plugin.addEventListener('progress', this.onPluginProgress_.bind(this));
    plugin.addEventListener('crash', this.onPluginCrash_.bind(this));
    plugin.addEventListener('message', this.onPluginMessage_.bind(this));
    plugin.setAttribute('src', this.nmfURL_);
    plugin.setAttribute('type', this.mimeType_);
    plugin.setAttribute('width', 0);
    plugin.setAttribute('height', 0);

    var tty = this.executeContext.getTTY();

    var lastSlash = this.nmfURL_.lastIndexOf('/');
    var nmfBase = this.nmfURL_.substr(lastSlash + 1);
    var urlBase = this.nmfURL_.substr(0, lastSlash + 1);

    var params = {
      arg0: this.arg0_,
      PS_TTY_PREFIX: 'stdio',
      PS_TTY_RESIZE: 'tty_resize',
      PS_TTY_COLS: tty.columns,
      PS_TTY_ROWS: tty.rows,
      PS_STDIN: '/dev/tty',
      PS_STDOUT: '/dev/tty',
      PS_STDERR: '/dev/tty',
      PS_VERBOSITY: '2',
      PS_EXIT_MESSAGE: 'exited',
      // Base url nacl startup code uses to download resources (.tar file)
      NACL_DATA_URL: urlBase,
      // Allow CORS requests when downloading resources (.tar file)
      NACL_DATA_MOUNT_FLAGS: 'allow_cross_origin_requests=true',
    };

    var env = this.executeContext.getEnvs();
    for (var key in env) {
      var keySigil = key.charAt(0);
      var envKey = null;
      var envValue = null;

      if (keySigil === '$') {
           // Arbitrary values go through unchanged.
          envKey = key.substr(1);
          envValue = env[key];
      } else if (keySigil === '@') {
        // Arrays are translated into list of elements separated by ":".
          envKey = key.substr(1);
          envValue = env[key].join(':');
      } else if (keySigil === '%') {
        // Dictionaries are ignored.
      } else {
        // No prefix is an error: ignore.
      }

      if (envKey && !params.hasOwnProperty(envKey)) {
          params[envKey] = envValue;
      }
    }

    for (var i = 0; i < this.posixArgs_.length; i++) {
      params['arg' + (i + 1)] = this.posixArgs_[i];
    }

    for (key in params) {
      var param = document.createElement('param');
      param.name = key;
      param.value = params[key];
      plugin.appendChild(param);
    }

    this.executeContext.onStdIn.addListener(this.onStdIn_.bind(this));
    this.executeContext.onTTYChange.addListener(this.onTTYChange_.bind(this));
    this.executeContext.onClose.addListener(this.onExecuteClose_.bind(this));

    this.executeContext.stdout('Loading.');
    document.body.appendChild(plugin);

    // Set mimetype twice for http://crbug.com/371059
    plugin.setAttribute('type', this.mimeType_);
  };

  SpawnNacl.prototype.onPluginProgress_ = function (e) {
    var message;

    if (e.lengthComputable && e.total) {
      var percent = Math.round(e.loaded * 100 / e.total);
      var kbloaded = Math.round(e.loaded / 1024);
      var kbtotal = Math.round(e.total / 1024);
      message = '\r\x1b[KLoading [' +
            kbloaded + ' KiB/' +
            kbtotal + ' KiB ' +
            percent + '%]';
    } else {
      message = '.';
    }

    this.executeContext.stdout(message);
  };

  SpawnNacl.prototype.onPluginLoad_ = function () {
    this.executeContext.stdout('\r\x1b[K');
    this.executeContext.requestTTY({ interrupt: '' });
  };

  SpawnNacl.prototype.onPluginLoadError_ = function (e) {
    this.executeContext.stdout(' ERROR.\n');
    this.executeContext.closeErrorValue(
          new axiom.core.error.AxiomError.Runtime('Plugin load error.'));
  };

  SpawnNacl.prototype.onPluginLoadAbort_ = function () {
    this.executeContext.stdout(' ABORT.\n');
    this.executeContext.closeErrorValue(
          new axiom.core.error.AxiomError.Runtime('Plugin load abort.'));
  };

  SpawnNacl.prototype.onPluginCrash_ = function () {
    if (this.executeContext.isOpen) {
      this.executeContext.closeErrorValue(
            new axiom.core.error.AxiomError.Runtime('Plugin crash: exit code: ' +
                this.plugin_.exitStatus));
    }
  };

  SpawnNacl.prototype.onPluginMessage_ = function (e) {
    var ary;

    if ((ary = e.data.match(/^stdio(.*)/))) {
      // Substr instead of ary[1] so we get newlines too.
      this.executeContext.stdout(e.data.substr(5));
    } else if ((ary = e.data.match(/^exited:(-?\d+)/))) {
      this.executeContext.closeOk(parseInt(ary[1]));
    }
  };

  SpawnNacl.prototype.onStdIn_ = function (value) {
    if (typeof value != 'string')
      return;

    var msg = {};
    msg['stdio'] = value;
    this.plugin_.postMessage(msg);
  };

  SpawnNacl.prototype.onTTYChange_ = function () {
    var tty = this.executeContext.getTTY();
    this.plugin_.postMessage({ 'tty_resize': [tty.columns, tty.rows] });
  };

  SpawnNacl.prototype.onExecuteClose_ = function (reason, value) {
    this.plugin_.parentElement.removeChild(this.plugin_);
  };
});
