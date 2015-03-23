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

import Path from 'axiom/fs/path';
import AxiomError from 'axiom/core/error';
import DataType from 'axiom/fs/data_type';

/** @typedef ReadResult$$module$axiom$fs$read_result */
var ReadResult;

var WASHRC_FILE_PATH = 'html5:/home/.washrc';

/**
 * @constructor
 *
 * Class exposing the read / write interface for washrc.
 * The interface is exposed to all executables, which can dynamically read
 * write into the washrc file.
 */
var Washrc = function(cx) {
console.log('tilting');
  this.path = WASHRC_FILE_PATH;
  this.cx = cx;
};
export {Washrc};
export default Washrc;

/**
 * @return {!Promise<Array>}
 */
Washrc.prototype.read = function() {

console.log('comes in read');
  var commands = [];
  return this.cx.fileSystem.readFile(
      new Path(this.path), DataType.UTF8String).then(
    function(/** ReadResult */ result) {
      try {
        if (typeof result.data != 'string') {
          return Promise.reject(new AxiomError.TypeMismatch(
              'string', typeof result.data));
        }
        var data = JSON.parse(result.data);
        if (data instanceof Array)
          commands = data;
      } catch (ex) {
        this.cx.stdout('Error loading: ' + this.path);
      }
      return Promise.resolve(commands);
    }.bind(this)
  ).catch(
    function(err) {
      // If the file does not exist return empty list
      return Promise.resolve(commands);
    }.bind(this)
  );
};

/**
 * @return {!Promise<null>}
*/
Washrc.prototype.write = function(commands) {
  return new Promise(function(resolve, reject) {
    return this.cx.fileSystem.writeFile(
      new Path(this.path),
      DataType.UTF8String,
      JSON.stringify(commands, null, ' ') + '\n'
    ).then(
        function() {
          return resolve(null);
        }.bind(this)
    ).catch(
      function(error) {
        return reject(new AxiomError.Runtime(error));
      }
    );
  }.bind(this));
};

/**
 * @return {!Promise<null>}
 */
Washrc.prototype.append = function(command) {
  return this.read().then(function(commands) {
    commands.push(command);
    return this.write(commands);
  });
};

/**
 * Executes the contents of washrc.
 *
 * @return {!Promise<null>}
 */
Washrc.prototype.execute = function(wash) {
  return this.read().then(function(commands) {
    var promises = [];
    commands.forEach(function(command) {
      var name = command.keys[0];
      var promise = wash.findExecutable(name).then(
        function(result) {
          return wash.executeContext.call(wash.fileSystem,
              new Path(result.absPath), command[name]);
        });
      promises.push(promise);
    });
      return Promise.all(promises);
  });
};