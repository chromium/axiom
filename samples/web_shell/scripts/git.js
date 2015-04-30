// Copyright 2015 Google Inc. All rights reserved.
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

// Run a local proxy server to inject CORS headers.
// TODO(grv): Host a live server on app engine.
var PROXY_SERVER_URL = 'pepper_http://localhost:8080/';
var GIT_NMF_FILE_PATH = 'scripts/resources/git';

// The subject field sent with each message to identify it.
var messageId = 1;

document.currentScript.ready(function(cx) {
  var GIT_CMD_USAGE_STRING = 'usage: git [options]';

  /**
   * @return {void}
   */
  var gitMain = function(cx) {
    cx.ready();

    /** @type {Array<string>} */
    var list = cx.getArg('_', []);
    if (list.length != 3 || cx.getArg('help')) {
      cx.stdout.write(GIT_CMD_USAGE_STRING + '\n');
      return cx.closeOk();
    }

    createMessage(cx).then(function(message) {
      /** @type {GitSalt} */
      var git = new GitSalt();

      git.loadPlugin('git_salt', GIT_NMF_FILE_PATH).then(function() {
        var cb = createMessageCallback(cx, message);
        git.postMessage(message, cb);
      }).catch(function(e) {
        cx.closeError(e);
      });
    });
  };

  gitMain.signature = {
    'help|h': '?',
    '_': '@'
  };

  var installGit = function(cx) {
    var path = new axiom.fs.path.Path('jsfs:/exe');
    var jsDir = cx.jsfs.resolve(path).entry;
    jsDir.install({
      'git': gitMain
    });
  };
  installGit(cx);
});

function genMessageId() {
 messageId++;
 return messageId.toString();
}

function createMessage(cx) {
  var message = {};
  var args = {};
  var list = cx.getArg('_', []);
  var command = list.shift();
  var path;

  // TODO(grv): Make the check case insensitive.
  if (command == 'clone' && list.length == 2) {
    message['name'] = 'clone';
    args['url'] = PROXY_SERVER_URL + list.shift();

    // TODO(grv): resolve path using pwd instead of taking as argument.
    path = new axiom.fs.path.Path(list.shift());
  } else {
    throw new axiom.core.error.AxiomError.Invalid(
        'Invalid arguments to git.', []);
  }

  return cx.fileSystemManager.mkdir(path).then(function(dir) {
    args['filesystem'] = dir.filesystem;
    args['fullPath'] = dir.fullPath;
    message['subject'] = genMessageId();
    message.arg = args;
    return message;
  });
}

function createMessageCallback(cx, message) {
  var cb = function(result) {
    console.log(message['name'] + ' command successful!');
    cx.closeOk();
  };
  return cb;
}

/**
 *@constructor
 */
var GitSalt = function() {
  this.callbacks = new Object();
};

GitSalt.prototype.listenerDiv = null;

GitSalt.prototype.loadPromise = null;

GitSalt.prototype.callbacks = {};

/**
 * Create the Native Client <embed> element as a child of the DOM element
 * named "listener".
 *
 * @param {string} name The name of the example.
 * @param {string} path Directory name where .nmf file can be found.
 */
GitSalt.prototype.createNaClModule = function(name, path) {
  return new Promise(function(resolve, reject) {
    this.loadPromise = resolve;
    var moduleEl = document.createElement('embed');
    moduleEl.setAttribute('width', 0);
    moduleEl.setAttribute('height', 0);
    moduleEl.setAttribute('path', path);
    moduleEl.setAttribute('src', path + '/' + name + '.nmf');

    moduleEl.setAttribute('type', "application/x-pnacl");
    this.naclModule = moduleEl;

    // The <EMBED> element is wrapped inside a <DIV>, which has both a 'load'
    // and a 'message' event listener attached.  This wrapping method is used
    // instead of attaching the event listeners directly to the <EMBED> element
    // to ensure that the listeners are active before the NaCl module 'load'
    // event fires.
    this.listenerDiv.appendChild(moduleEl);
  }.bind(this));
};

GitSalt.prototype.statusText = 'NO-STATUSES';

GitSalt.prototype.updateStatus = function(opt_message) {
  if (opt_message) {
    statusText = opt_message;
  }
}

/**
 * Add the default "load" and "message" event listeners to the element with
 * id "listener".
 *
 * The "load" event is sent when the module is successfully loaded. The
 * "message" event is sent when the naclModule posts a message using
 * PPB_Messaging.PostMessage() (in C) or pp::Instance().PostMessage() (in
 * C++).
 */
GitSalt.prototype.attachDefaultListeners = function() {
  this.listenerDiv.addEventListener('load', this.moduleDidLoad.bind(this), true);
  this.listenerDiv.addEventListener('message', this.handleMessage.bind(this), true);
  this.listenerDiv.addEventListener('error', this.handleError.bind(this), true);
  this.listenerDiv.addEventListener('crash', this.handleCrash.bind(this), true);
};

/**
 * Called when the NaCl module fails to load.
 *
 * This event listener is registered in createNaClModule above.
 */
GitSalt.prototype.handleError = function(event) {
  this.updateStatus('ERROR [' + this.naclModule.lastError + ']');
};

/**
 * Called when the Browser can not communicate with the Module
 *
 * This event listener is registered in attachDefaultListeners above.
 */
GitSalt.prototype.handleCrash = function(event) {
  if (this.naclModule.exitStatus == -1) {
    this.updateStatus('CRASHED');
  } else {
    this.updateStatus('EXITED [' + this.naclModule.exitStatus + ']');
  }
  if (typeof window.handleCrash !== 'undefined') {
    window.handleCrash(this.naclModule.lastError);
  }
};

/**
 * Called when the NaCl module is loaded.
 *
 * This event listener is registered in attachDefaultListeners above.
 */
GitSalt.prototype.moduleDidLoad = function() {
  this.updateStatus('RUNNING');
  if (typeof window.moduleDidLoad !== 'undefined') {
    window.moduleDidLoad();
  }
  if (this.loadPromise != null) {
    this.loadPromise();
    this.loadPromise = null;
  }
};

/**
 * Hide the NaCl module's embed element.
 *
 * We don't want to hide by default; if we do, it is harder to determine that
 * a plugin failed to load. Instead, call this function inside the example's
 * "moduleDidLoad" function.
 *
 */
GitSalt.prototype.hideModule = function() {
  // Setting GitSalt.naclModule.style.display = "None" doesn't work; the
  // module will no longer be able to receive postMessages.
  this.naclModule.style.height = '0';
};

/**
 * Remove the NaCl module from the page.
 */
GitSalt.prototype.removeModule = function() {
  this.naclModule.parentNode.removeChild(this.naclModule);
  this.naclModule = null;
};

/**
 * Return true when |s| starts with the string |prefix|.
 *
 * @param {string} s The string to search.
 * @param {string} prefix The prefix to search for in |s|.
 */
GitSalt.prototype.startsWith = function(s, prefix) {
  // indexOf would search the entire string, lastIndexOf(p, 0) only checks at
  // the first index. See: http://stackoverflow.com/a/4579228
  return s.lastIndexOf(prefix, 0) === 0;
};

GitSalt.prototype.logMessage = function(message) {
  console.log(message);
};

GitSalt.prototype.defaultMessageTypes = {
  'alert': alert,
  'log': this.logMessage
};

/**
 * Called when the NaCl module sends a message to JavaScript (via
 * PPB_Messaging.PostMessage())
 *
 * This event listener is registered in createNaClModule above.
 *
 * @param {Event} message_event A message event. message_event.data contains
 *     the data sent from the NaCl module.
 */
GitSalt.prototype.handleMessage = function(message_event) {
  if (typeof message_event.data === 'string') {
    for (var type in this.defaultMessageTypes) {
      if (this.defaultMessageTypes.hasOwnProperty(type)) {
        if (this.startsWith(message_event.data, type + ':')) {
          func = this.defaultMessageTypes[type];
          func(message_event.data.slice(type.length + 1));
          return;
        }
      }
    }
  }

  this.handleResponse(message_event);
};

GitSalt.prototype.handleResponse = function(response) {
   var cb = this.callbacks[response.data.regarding];
   if (cb != null) {
     cb(response.data.arg);
     this.callbacks[response.data] = null;
   }
};

/**
 * @param {string} name The name of the example.
 * @param {string} path Directory name where .nmf file can be found.
 */
GitSalt.prototype.loadPlugin = function(name, path) {
  this.listenerDiv = document.createElement('div');

  var gitSaltDiv = document.getElementById('git-salt-div');
  if (!gitSaltDiv) {
    gitSaltDiv = document.createElement('div');
    gitSaltDiv.id = 'git-salt-div';
    document.body.appendChild(gitSaltDiv);
  }

  var gitSaltContainer = document.getElementById('git-salt-container');
  if (!gitSaltContainer) {
    gitSaltContainer = document.createElement('div');
    gitSaltContainer.id = 'git-salt-container';
    gitSaltDiv.appendChild(gitSaltContainer);
  }
  gitSaltContainer.appendChild(this.listenerDiv);

  this.attachDefaultListeners();
  return this.createNaClModule(name, path);
};

GitSalt.prototype.postMessage = function(message, cb) {
  this.callbacks[message.subject] = cb;
  this.naclModule.postMessage(message);
};
