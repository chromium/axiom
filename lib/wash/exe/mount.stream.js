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

import AxiomError from 'axiom/core/error';
import StubFileSystem from 'axiom/fs/stream/stub_file_system';
import DataType from 'axiom/fs/data_type';
import Path from 'axiom/fs/path';

import Channel from 'axiom/fs/stream/channel';
import Transport from 'axiom/fs/stream/transport';
import WebSocketStreams from 'axiom/fs/stream/web_socket_streams';
import ExtensionStreams from 'axiom/fs/stream/extension_streams';

/** @typedef FileSystemManager$$module$axiom$fs$base$file_system_manager */
var FileSystemManager;

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef ReadableStream$$module$axiom$fs$stream$readable_stream */
var ReadableStream;

/** @typedef ReadResult$$module$axiom$fs$read_result */
var ReadResult;

/** @typedef WritableStream$$module$axiom$fs$stream$writable_stream */
var WritableStream;

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {
  cx.ready();

  var list = cx.getArg('_', []);
  if (list.length !== 1 || cx.getArg('help')) {
    cx.stdout.write([
      'usage: mount.stream [-n|--name <name>] <path-to-stream>',
      'Mount a Stream file system.',
      '',
      'If -n is provided, it\'ll be used as the name of the new file system.',
    ].join('\r\n') + '\r\n');
    cx.closeOk();
    return;
  }

  /** @type {!FileSystemManager} */
  var fsm = cx.fileSystemManager;
  /** @type {!string} */
  var name = cx.getArg('name', 'streamfs');
  /** @type {string} */
  var pwd = cx.getPwd();
  /** @type {!Path} */
  var path = Path.abs(pwd, list[0]);

  mountStream_(cx, fsm, name, path).then(
    function() {
      cx.closeOk();
    }
  ).catch(
    function(error) {
      cx.closeError(error);
    }
  )
};

main.signature = {
  'help|h': '?',
  'name|n': '$',
  '_': '@'
};

export default main;

/**
 * @param {!JsExecuteContext} cx
 * @param {!FileSystemManager} fileSystemManager
 * @param {!string} name
 * @param {!Path} path
 * @return {!Promise}
 */
var mountStream_ = function(cx, fileSystemManager, name, path) {
  return fileSystemManager.readFile(path, DataType.UTF8String).then(
    function(/** ReadResult */ result) {
      if (typeof result.data != 'string') {
        return Promise.reject(new AxiomError.TypeMismatch(
            'string', typeof result.data));
      }
      var data = JSON.parse(result.data);
      if (!(data instanceof Object)) {
        return Promise.reject(new AxiomError.TypeMismatch(
            'object', typeof data));
      }

      var streamType = data['type'];
      if (typeof streamType !== 'string') {
        return Promise.reject(new AxiomError.TypeMismatch(
            'string', typeof streamType));
      }

      var streamSrc = data['src'];
      if (typeof streamSrc !== 'string') {
        return Promise.reject(new AxiomError.TypeMismatch(
            'string', typeof streamSrc));
      }

      cx.stdio.stdout.write('Connecting to "' + streamSrc + '"...');

      return createStreams_(cx, streamType, streamSrc).then(function(streams) {
        cx.stdio.stdout.write('ok\n');
        var transport = new Transport(
            streamType,
            streams.readableStream,
            streams.writableStream);
        var channel = new Channel(streamType + 'channel', streams.prefixId,
            transport);
        var fileSystem =
            new StubFileSystem(fileSystemManager, name, channel);
        fileSystem.description =
            name + ' - ' + streamType + ' - ' + streamSrc;

        fileSystem.onClose.addListener(function() {
          streams.close();
        });
        streams.resume();

        // Connect file system to remote end to make sure we have a valid
        // and supported Channel.
        return fileSystem.connect().then(
          function() {
            fileSystemManager.mount(fileSystem);
          }
        ).then(
          function() {
            cx.stdout.write('Mounted file system "' +
                fileSystem.name + ':" from "' + streamSrc + '"\n');
          },
          function(error) {
            fileSystem.closeError(error);
            return Promise.reject(error);
          }
        );
      },
      function(error) {
        cx.stdio.stdout.write('error\n');
        return Promise.reject(error);
      });
    }
  );
};

/**
  * @typedef {{
  *  readableStream: !ReadableStream,
  *  writableStream: !WritableStream,
  *  close: !function():void,
  *  resume: !function():void,
  *  prefixId: string
  * }}
  */
var CreateStreamsResult;

/**
 * @param {!JsExecuteContext} cx
 * @param {!string} streamType
 * @param {!string} streamSrc
 * @return {!Promise<!CreateStreamsResult>}
 */
var createStreams_ = function(cx, streamType, streamSrc) {
  var streams;

  return Promise.resolve().then(function() {
    switch (streamType) {
      case 'websocket':
        streams = new WebSocketStreams();
        return streams.open(streamSrc).then(function() {return "ws"});
      case 'extension':
        streams = new ExtensionStreams();
        return streams.openExtension(streamSrc).then(function() {return "ext"});
      default:
        return Promise.reject(
            new AxiomError.Invalid('type', streamType));
    }
  }).then(function(/* string */ prefixId) {
    /** @type {!CreateStreamsResult} */
    var result = {
      readableStream: streams.readableStream,
      writableStream: streams.writableStream,
      close: function() { streams.close(); },
      resume: function() { streams.resume(); },
      prefixId: prefixId
    };
    return Promise.resolve(result);
  })
};
