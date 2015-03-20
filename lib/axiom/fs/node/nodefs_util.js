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

import Path from 'axiom/fs/path';
import StatResult from 'axiom/fs/stat_result';
import AxiomError from 'axiom/core/error';

export var nodefsUtil = {};
export default nodefsUtil;

/**
 * Convert a Path instance into a string that can be used as an abolute path
 * for calling into the node fs module.
 *
 * @param {Path} path
 * @return {!string}
 */
nodefsUtil.makeNodefsPath = function(path) {
  if (!path || !path.isValid)
    throw new AxiomError.Invalid('path', path.originalSpec);

  // Note: path.relSpec always start with a '/', so it is compatible with node
  // fs paths. When we support Windows drive letters, there will be some actual
  // string conversion to be made.
  return path.relSpec;
};

/**
 * List all file entries in a given nodefs directory.
 *
 * @param {!*} fs node filesystem.
 * @param {Path} path Path of the target directory.
 * @return {!Promise<!Object<!string, !StatResult>>} A object where keys are
 *  file/directory names and values are StatResult instances.
 */
nodefsUtil.listDirectory = function(fs, path) {
  return new Promise(function(resolve, reject) {
    var cb = function(err, files) {
      if (err) {
        return reject(err);
      }

      var rv = {};
      var statFile = function(file) {
        var filePath = path.combine(file);
        return nodefsUtil.statPath(fs, filePath).then(function(statResult) {
          rv[file] = statResult;
        }).catch(function(e) {
          // Skip files that we can't get 'stat' for
          // TODO(rpaquay) Add support for returning incomplete stat result.
        });
      }

      var promises = [];
      for (var i = 0; i < files.length; i++) {
        var promise = statFile(files[i]);
        promises.push(promise);
      }

      Promise.all(promises).then(function() {
        resolve(rv);
      }).catch(reject);
    };
    fs.readdir(nodefsUtil.makeNodefsPath(path), cb);
  });
};

/**
 * @param {!*} fs node filesystem.
 * @param {!Path} path Path to the node file system entry.
 * @return {!Promise<!StatResult>}
 */
nodefsUtil.statPath = function(fs, path) {
  return new Promise(function(resolve, reject) {
    var cb = function(err, stat) {
      if (err)
        return reject(err);
      resolve(nodefsUtil.mapStat(stat));
    };
    fs.stat(nodefsUtil.makeNodefsPath(path), cb);
  });
};

/**
 * @param {!Object} stat  node fs stat object
 * @return {!StatResult}
 */
nodefsUtil.mapStat = function(stat) {
  var stat_new = new StatResult({});
  stat_new.mtime = stat['mtime'];
  stat_new.size = stat['size'];
  if (stat.isFile()) {
    stat_new.mode = Path.Mode.R | Path.Mode.W | Path.Mode.K;
  } else if (stat.isDirectory()) {
    stat_new.mode = Path.Mode.D;
  }
  return stat_new;
};
