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

import JsFileSystem from 'axiom/fs/js/file_system';
import SkeletonFileSystem from 'axiom/fs/stream/skeleton_file_system';
import Transport from 'axiom/fs/stream/transport';
import Channel from 'axiom/fs/stream/channel';
import ExtensionStreams from 'axiom/fs/stream/extension_streams';
import chromeCommand from 'chrome_command';

/**
 * Host filesystem with chrome handling executable for use with axiom.
 *
 * @constructor
 * @implements {StreamsSource}
 */
export var ChromeAgent = function() {
  var jsfs = new JsFileSystem();
  var fsm = jsfs.fileSystemManager;

  var streams = new ExtensionStreams();
  var transport = new Transport(
      'PostMessageTransport',
      streams.readableStream,
      streams.writableStream);
  var channel = new Channel('PostMessageChannel', transport);
  var skeleton = new SkeletonFileSystem('extfs', jsfs, channel);
  streams.listenAsExtension().then(function() {
    return jsfs.rootDirectory.mkdir('exe').then(function(jsdir) {
      jsdir.install({'chrome': chromeCommand});
    }.bind(this));
  }.bind(this))
  streams.resume();

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
}

/**
 * @param {!Object<string, *>} request
 * @param {function(*): void} sendResponse
 * @return {void}
 */
ChromeAgent.prototype.handleRequest_ = function(request, sendResponse) {
  console.log(request);
  var promise;
  promise = Promise.resolve("guid");
  var Streams

  promise.then(function(result) {

    sendResponse({success: true, result: result});
  }).catch(function(error) {
    sendResponse({success: false, error: error.message ? error.message : error});
  });
};


