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

// State is set to true when waiting for a response from the page.
var state = 0;
var messagePort = null;
var messageQueue = [];
var promiseQueue = {};
var messageId = 1;

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

function isFileSystemUrl(url) {
  var re = /\/local\/.*/;
  var matches = re.exec(url);
  return !!matches;
};

// First in First out message queue implementation.
// TODO(grv): Add timeout for failed requests.
function processQueue() {
  if (!state && messageQueue.length > 0 && messagePort) {
    state = 1;
    var next = messageQueue.shift();
    messagePort.postMessage(next.message);
    promiseQueue[next.message.subject] = next;
  }
};

// Sends a refresh request every 10 seconds to the page, if there is no pending
// fetch request. Modifies the state to 1 (pending). Thus, even if the connection
// is broken in between, the fetch requests are queued until the page responds
// with a new connection. Note that any response from the page is a new connection.
function messagePoll() {
  setTimeout(function() {
   if (!state  && messagePort) {
     state = 1;
     var message = {
       subject: genMessageId(),
       name: 'refresh'
     };
     messagePort.postMessage(message);
   }
   messagePoll();
  }, 10000);
};

messagePoll();

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
    event.respondWith(new Promise(function(resolve, reject) {
      messageQueue.push({
        'message': message,
        'resolve': resolve,
        'reject': reject
      });
      processQueue();
    }));
  }
});

this.addEventListener('message', function(event) {
  var message = event.data;
  if (message.name == 'response') {
    var obj = promiseQueue[message.subject];
    if (obj) {
      if (!message.error) {
        obj.resolve(new Response(message.result[0], {headers: {
            'Content-Type': 'text/html'}}));
        delete promiseQueue[message.subject];
      } else {
        obj.resolve(new Response(message.error));
      }
    }
  }
  messagePort = event.ports[0];
  state = 0;
  processQueue();
});
