import JsFileSystem from 'axiom/fs/js/file_system';
import SkeletonFileSystem from 'axiom/fs/stream/skeleton_file_system';
import Transport from 'axiom/fs/stream/transport';
import Channel from 'axiom/fs/stream/channel';
import PostMessageStreams from 'axiom/fs/stream/post_message_streams';
import washExecutables from 'wash/exe_modules';

// import JsFileSystem from 'axiom/fs/js/file_system';

// Copyright (c) 2015 Google Inc. All rights reserved.
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

/**
 * @param {!Object<string, *>} request
 * @param {function(*): void} sendResponse
 * @return {void}
 */
var handleRequest_ = function(request, sendResponse) {
  console.log(request);
  var promise;
  promise = Promise.resolve("guid");
  var Streams

  // if (request.type === 'call_api') {
  //   promise = callApi_(resolveApi_(request.api), request.args, request.options);
  // } else if (request.type === 'execute_script') {
  //   promise = executeScriptInTabs_(request.tabIds, request.code, request.options);
  // } else if (request.type === 'insert_css') {
  //   promise = insertCssIntoTabs_(request.tabIds, request.css, request.options);
  // } else {
  //   promise = Promise.reject('Unrecognized request type "' + request.type + '"');
  // }

  promise.then(function(result) {

    sendResponse({success: true, result: result});
  }).catch(function(error) {
    sendResponse({success: false, error: error.message ? error.message : error});
  });
};

/**
 * This is sent by our companion content script injected into a browser tab.
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    // Indicate that the response is sent asynchronously.
    return true;
  }
);

/**
 * This is sent by a client to request some service from us.
 */
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    // TODO(ussuri): Verify the sender.
    handleRequest_(request, sendResponse);
    // Indicates that the response is sent asynchronously.
    return true;
  }
);

// var FileSystemManager = require('axiom/fs/base/file_system_manager').default;
// var JsFileSystem = require('axiom/fs/js/file_system').default;
// var washExecutables = require('wash/exe_modules').dir;
// var FileSystemManager = require('axiom/fs/base/file_system_manager').default;

function init() {
  var jsfs = new JsFileSystem();
  var fsm = jsfs.fileSystemManager;

  var streams = new PostMessageStreams();
  var transport = new Transport(
      'PostMessageTransport',
      streams.readableStream,
      streams.writableStream);
  var channel = new Channel('PostMessageChannel', transport);
  var skeleton = new SkeletonFileSystem('extfs', jsfs, channel);
  streams.resume();
  chrome.runtime.onConnectExternal.addListener(function(port) {
    streams.open(port);
    port.postMessage({command: 'connected'})
  });




  // return jsfs.rootDirectory.mkdir('exe').then(function(jsdir) {
  //   jsdir.install(washExecutables);
  //   var cmds = {};
    // socketfs.main.signature = socketfs.signature;
    // cmds[socketfs.name] = socketfs.main;
    // jsdir.install(cmds);
    // mountNodefs(fsm);
    // return startWash(fsm);
}

init();
