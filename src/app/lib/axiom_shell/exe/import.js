// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import environment from 'axiom_shell/environment';

export var main = function(cx) {
  var onImportLoaded = function(resolve, reject, e) {
    var todoList = [];

    // There could be multiple x-axiom-plugin nodes in this import.
    var plugins = e.target.import.querySelectorAll('x-axiom-plugin');

    // Find them all, sanity check them, and add to a list of plugins to
    // process.
    for (var i = 0; i < plugins.length; i++) {
      var plugin = plugins[i];
      var desc = plugin.getAttribute('x-descriptor-module');
      if (!desc)
        console.stderr('Missing x-descriptor-module');

      var main = plugin.getAttribute('x-main-module');
      if (!main)
        console.stderr('Missing x-main-module');

      if (desc && main)
        todoList.push([desc, main]);
    }

    // Bail out if we don't find any valid plugins.
    if (!todoList.length)
      return reject(null);

    var nextTodo = function() {
      if (!todoList.length)
        return resolve(null);

      var todo = todoList.shift();
      var descriptor = environment.requireModule(todo[0])['default'];
      if (!descriptor) {
        return resolve(new AxiomError.Runtime(
            'No descriptor exported by: ' + todo[0]));
      }

      var module = environment.defineModule(descriptor);
      cx.stdout('New module: ' + module.moduleId + '\n');

      var main = environment.requireModule(todo[1])['default'];
      if (!main) {
        return resolve(new AxiomError.Runtime(
            'No main exported by: ' + todo[1]));
      }

      return main(module, { sourceUrl: e.target.import.URL }).then(
        function() {
          cx.stdout('Module ready.\n');
          return nextTodo();
        });
    };

    return nextTodo();
  };

  return new Promise(function(resolve, reject) {
      cx.ready();
      var url = cx.arg.url;
      if (!url)
        return reject(new AxiomError.Missing('url'));

      var link = document.createElement('link');
      link.rel = 'import';
      link.href = url;
      link.addEventListener('error', function(e) {
          cx.stdout('Error loading import: ' + e.target.href + '\n');
          link.parentNode.removeChild(link);
          return reject(null);
        });

      link.addEventListener('load',
                            onImportLoaded.bind(null, resolve, reject));

      document.head.appendChild(link);
    });
};

export default main;

main.argSigil = '%';
