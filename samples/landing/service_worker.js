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

var messagePort = null;
var messageId = 1;
// TODO(grv): implement a message queue.
var gresolve = null;

function genMessageId() {
  messageId++;
  return messageId;
};

function createMessage(request) {
  var message = {};
  message.subject = genMessageId();
  message.name = 'filesystem';
  message.args = {'url': request.url};
  return message;
};

var resolveRequest = function(message) {
  gresolve(new Response(message));
  gresolve = null;
};

function isFileSystemUrl(url) {
  var re = /\/local\/.*/;
  var matches = re.exec(url);
  console.log(matches);
  return !!matches;
};

// Currently it is not possible to initiate post message request from service
// worker. As a result we send a dummy request from the axiom_web_shell and
// maintain an open connection. Whenever a fetch event is received by the
// worker it responds to the dummy request requesting the page to be loaded.
// The web shell responds to the requested page as a new request. This
// request awaits until next fetch event. Thus an open connection is always
// maintained.
// TODO(grv): Add timeout to the request and open a new connection after
// timeout.
this.addEventListener('fetch', function(event) {
  if (!isFileSystemUrl(event.request.url)) {
    fetch(event.request).then(function(r) {
    });
  } else {
    var message = createMessage(event.request);
    messagePort.postMessage(message);
    event.respondWith(new Promise(function(resolve, reject) {
      // TODO(grv): add timeout for failed request.
      gresolve = resolve;
    }));
  }
});

this.addEventListener('message', function(event) {
  var message = event.data;
  if (message.name == 'response') {
    resolveRequest(message.result[0]);
  }
  messagePort = event.ports[0];
});
