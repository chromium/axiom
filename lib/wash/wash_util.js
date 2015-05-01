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
  * @typedef {{fileSystem: !FileSystem, path: !Path, statResult: !StatResult}}
  */
var FindExecutableResult;

/**
 * @param {ExecuteContext} cx
 * @param {string} pathSpec
 * @return {!Promise<!FindExecutableResult>}
 */
washUtil.findExecutable = function(cx, pathSpec) {
  // If path is absolute, find it directly.
  var path = new Path(pathSpec);
  if (path.isValid) {
    return washUtil.findExecutableAt_(cx, path);
  }

  // Otherwise, use "@PATH" as a list of prefixes for the path.
  var rootPath = cx.fileSystemManager.defaultFileSystem.rootPath;
  var searchList = cx.getEnv('@PATH', [rootPath.spec]);

  /** @type {function(): !Promise<!FindExecutableResult>} */
  var searchNextPath = function() {
    if (!searchList.length)
      return Promise.reject(new AxiomError.NotFound('path', pathSpec));

    var currentPrefix = searchList.shift();
    var currentPath = new Path(currentPrefix).combine(pathSpec);
    return washUtil.findExecutableAt_(cx, currentPath).then(
      function(result) {
        return result;
      },
      function(error) {
        if (AxiomError.NotFound.test(error))
          return searchNextPath();

        return Promise.reject(error);
      }
    );
  };

  return searchNextPath();
};

/**
 * @param {ExecuteContext} cx
 * @param {string} pathSpec
 * @return {!Promise<!FindExecutableResult>}
 */
washUtil.findExecutableAt_ = function(cx, path) {
  return cx.fileSystemManager.stat(path).then(
    function(statResult) {
      if (statResult.mode & Path.Mode.X) {
        return Promise.resolve({
            fileSystem: cx.fileSystemManager,
            path: path,
            statResult: statResult
        });
      }
      return Promise.reject(new AxiomError.NotFound('path', path.originalSpec));
    }
  );
};
