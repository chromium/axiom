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

import FileSystemManager from 'axiom/fs/base/file_system_manager';
import Path from 'axiom/fs/path';
import AxiomError from 'axiom/core/error';

const SCOPE_URL = "/";

/**
 * @constructor
 *
 * A Service worker class.
 *
 * @param FileSystemManager fsm
 */
var ServiceWorker = function(fsm) {
  this.fsm = fsm;
};

export {ServiceWorker};
export default ServiceWorker;

/**
 *
 * @return Promise<null>
 */
ServiceWorker.prototype.register = function() {
  if ('serviceWorker' in navigator) {

    var curloc = document.location.href.split('/');
    curloc = curloc.slice(0, -1).join('/');
    var scope = curloc + SCOPE_URL;
    var swURL = curloc + '/service_worker.js';
    return navigator.serviceWorker.register(swURL, {scope: scope}).then(
        function(reg) {
      // registration worked
      console.log('Registration succeeded. Scope is ' + reg.scope);
    }).catch(function(error) {
      // registration failed
      return Promise.reject(new AxiomError.Runtime(
          'Registration failed with ' + error));
    });
  }
}

/**
 * @param {string} message
 *
 * @return Promise<@>
 */
ServiceWorker.prototype.processMessage = function(message) {

  // An empty message refreshes the connection.
  if (message.name == 'refresh') {
    return this.sendMessage(null);
  }

  var path = this.getFileSystemPath(message);

  return new Promise(function(resolve, reject) {
    return this.readPath(path).then(function(data) {
      var response = this.createResponse(message.subject, data);
      return this.sendMessage(response);
    }.bind(this)).catch(function(e) {
      var response = this.createResponse(message.subject, null, e);
      return this.sendMessage(response);
    }.bind(this));
  }.bind(this));
};

/**
 *
 * @param {string} subject
 * @param {@} data
 *
 * @return {@}
 */
ServiceWorker.prototype.createResponse = function(subject, data, error) {
  var response = {};
  response.subject = subject;
  response.name = 'response';
  response.result = [data];
  response.error = error;
  return response;
};

/**
 *
 * @param {Path} path
 *
 * @return Promise<*>
 */
ServiceWorker.prototype.readPath = function(path) {
  return new Promise(function(resolve, reject) {
    return this.fsm.readFile(path).then(function(result) {
      return resolve(result.data);
    }.bind(this)).catch(function(e) {
      reject(path.spec + ' : Error in reading file.');
    });
  }.bind(this));
};

/**
 * @param {@} message
 *
 * @return {Path}
 */
ServiceWorker.prototype.getFileSystemPath = function(message) {
  if (!message || message.name !== 'filesystem' || !message.args
      || !message.args.url) {
    throw new AxiomError.Invalid(message);
  }

  var re = /\/local\/.*/;
  var matches = re.exec(message.args.url);
  if (!matches || !matches[0].startsWith('/local/')) {
    throw new AxiomError.Invalid('Invalid Error:', message);
  }

  var result = matches[0];

  // Remove /local/ prefix.
  result = result.substr(7);

  var fileSystems = this.fsm.getFileSystems();

  for (var i = 0; i < fileSystems.length; ++i) {
    if (result.startsWith(fileSystems[i].name)) {
       var length = fileSystems[i].name.length;
       result = result.substr(0, length) + ':' + result.substr(length);
       return new Path(result);
    }
  }

  throw new AxiomError.Invalid('Invalid Error:', message.args.url);
}

/*
 * @param {string} message
 *
 * @return Promise<@>
 */
ServiceWorker.prototype.sendMessage = function(message) {
  if (!message) {
    message = {
      'subject': 0,
      'name': 'welcome'
    };
  }

  return new Promise(function(resolve, reject) {
    var messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function(event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        return this.processMessage(event.data);
      }
    }.bind(this);

    if (navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function(reg) {
        reg.active.postMessage(message, [messageChannel.port2]);
      });
    }
  }.bind(this));
};
