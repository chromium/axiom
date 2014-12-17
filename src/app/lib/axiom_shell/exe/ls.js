// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import Path from 'axiom/fs/path';

import environment from 'axiom_shell/environment';
import util from 'axiom_shell/util';

var formatStat = function(stat) {
  if (stat.mtime) {
    var d = new Date(stat.mtime);
    stat.mtime = d.getFullYear() + '-' +
    util.string.zpad(d.getMonth() + 1, 2) + '-' +
    util.string.zpad(d.getDay(), 2) + ' ' +
    d.toLocaleTimeString();
  }

  var keys = Object.keys(stat).sort();

  stat.mode = Path.modeIntToString(stat.mode);

  var ary = [];
  for (var i = 0; i < keys.length; i++) {
    ary.push(keys[i] + ': ' + JSON.stringify(stat[keys[i]]));
  }

  return ary.join(', ');
};

export var main = function(executeContext) {
  executeContext.ready();

  var pathSpec = executeContext.arg || '';
  pathSpec = Path.abs(executeContext.getEnv('$PWD', '/'), pathSpec);

  var fileSystem = environment.getServiceBinding('filesystems@axiom');

  return fileSystem.list(pathSpec).then(
    function(listResult) {
      var names = Object.keys(listResult).sort();
      var rv = 'count ' + names.length + '\n';

      if (names.length > 0) {
        var longest = names[0].length;
        names.forEach(function(name) {
          if (name.length > longest) longest = name.length;
        });

        names.forEach(function(name) {
          var stat = listResult[name];
          rv += name;
          rv += (stat.mode & Path.mode.d) ? '/' : ' ';
          for (var i = 0; i < longest - name.length; i++) {
            rv += ' ';
          }

          rv += '   ' + formatStat(stat) + '\n';
        });
      }

      executeContext.stdout(rv);
      executeContext.closeOk(null);
    }
  ).catch(
   function(value) {
     if (AxiomError.TypeMismatch.test(value)) {
       return fileSystem.stat(pathSpec).then(
         function(stat) {
           executeContext.stdout(new Path(pathSpec).getBaseName() + '  ' +
               formatStat(stat) + '\n');
           executeContext.closeOk(null);
         }
       ).catch(
         function(value) {
           return executeContext.closeErrorValue(value);
         }
       );
     } else {
       return executeContext.closeErrorValue(value);
     }
   });
};

main.argSigil = '$';

export default main;
