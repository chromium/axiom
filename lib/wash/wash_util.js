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

export var washUtil = {};
export default washUtil;

/** @typedef ExecuteContext$$module$axiom$fs$base$execute_context */
var ExecuteContext;

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/**
 * @param {ExecuteContext} cx
 * @param {string} pathSpec
 * @return {!Promise<!{path: !Path, statResult: StatResult}>}
 */
washUtil.findExecutable = function(cx, pathSpec) {
  var rootPath = cx.fileSystemManager.defaultFileSystem.rootPath;
  var searchList = cx.getEnv('@PATH', [rootPath.spec]);
  var localPath = Path.abs(cx.getPwd(), pathSpec);

  /** @type {function(): !Promise<!{path: !Path, statResult: StatResult}>} */
  var searchNextPath = function() {
    if (!searchList.length)
      return Promise.reject(new AxiomError.NotFound('path', pathSpec));

    var currentPrefix = searchList.shift();
    var currentPath = new Path(currentPrefix).combine(pathSpec);
    return cx.fileSystemManager.stat(currentPath).then(
      function(statResult) {
        if (statResult.mode & Path.Mode.X) {
          return Promise.resolve({
              fileSystem: cx.fileSystemManager,
              path: currentPath,
              statResult: statResult
          });
        }
        return searchNextPath();
      }
    ).catch(function(value) {
      if (AxiomError.NotFound.test(value))
        return searchNextPath();

      return Promise.reject(value);
    });
  };

  return cx.fileSystemManager.stat(localPath).then(
    function(statResult) {
      if (statResult.mode & Path.Mode.X) {
        return Promise.resolve({
          fileSystem: this.fileSystemManager,
          path: localPath,
          statResult: statResult
        });
      }
      return searchNextPath();
    }.bind(this)
  ).catch(function(value) {
    return searchNextPath();
  }.bind(this));
};



