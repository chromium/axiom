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

// This is the node.js require function, we declare it here so that the
// closure compiler lets us require node modules from inside this module.
var require;

/** @return {boolean} */
var isWin = function() {
  var os = require('os');
  return os.platform() == 'win32';
};

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

  if (isWin()) {
    // On Windows, skip the leading '/', as the rest of the path is an absolute
    // Windows path starting with drive letter.
    var result = path.relSpec.substring(1);
    if (result[result.length - 1] === ':')
      result += '/';
    return result;
  } else {
    // Note: On other platforms, path.relSpec is compatible with node fs paths
    // as the leading character is '/'.
    return path.relSpec;
  }
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
  if (!path || !path.isValid)
    return Promise.reject(new AxiomError.Invalid('path', path.originalSpec));

  if (isWin() && path.elements.length == 0) {
    return nodefsUtil.listWindowsLogicalDrives(fs, path)
  }

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
      };

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
 * List all known logical drives (C:, D:, etc).
 * See http://stackoverflow.com/questions/12622758/list-partitions-in-nodejs
 *
 * @param {!*} fs  node file system module.
 * @param {Path} path  The root path of the file system.
 * @return {!Promise<!Object<!string, !StatResult>>} A object where keys are
 *  drive letters and values are StatResult instances.
 */
nodefsUtil.listWindowsLogicalDrives = function(fs, path) {
  return new Promise(function(resolve, reject) {
    var stdout = '';
    var spawn = require('child_process')['spawn'];
    var list  = spawn('cmd');

    list.stdout.on('data', function (data) {
      stdout += data;
    });

    list.stderr.on('data', function (data) {
    });

    list.on('exit', function (code) {
      if (code == 0) {
        var data = stdout.split('\r\n');
        data = data.splice(4, data.length - 7);
        data = data.map(Function.prototype.call, String.prototype.trim);

        var rv = {};
        var statDrive = function(drive) {
          var filePath = path.combine(drive);
          return nodefsUtil.statPath(fs, filePath).then(function(statResult) {
            rv[drive] = statResult;
          }).catch(function(e) {
            // Skip drives that we can't get 'stat' for
            // TODO(rpaquay) Add support for returning incomplete stat result.
          });
        };

        var promises = [];
        for(var i = 0; i < data.length; i++) {
          promises.push(statDrive(data[i]));
        }

        Promise.all(promises).then(function() {
          return resolve(rv);
        });
      } else {
        reject(new AxiomError.Runtime('Error listing logical drive letters'));
      }
    });
    list.stdin.write('wmic logicaldisk get caption\n');
    list.stdin.end();
  });
};

/**
 * @param {!*} fs node filesystem.
 * @param {Path} path Path to the node file system entry.
 * @return {!Promise<!StatResult>}
 */
nodefsUtil.statPath = function(fs, path) {
  return new Promise(function(resolve, reject) {
    if (isWin() && path.elements.length == 0) {
      // Windows does not have a root directory, but we should still expose one
      // so that stat("nodefs:/") returns a directory entry.
      var result = new StatResult({});
      result.mtime = Date.UTC(2015, 1, 1);
      result.size = 0;
      result.mode = Path.Mode.D;
      resolve(result);
    }
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
