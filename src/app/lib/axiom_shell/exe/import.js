// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import environment from 'axiom_shell/environment';

export var main = function(cx) {
  var onImportLoaded = function(resolve, reject, e) {
    var pluginList = [];

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
        pluginList.push([desc, main]);
    }

    // Bail out if we don't find any valid plugins.
    if (!pluginList.length)
      return reject(null);

    var nextPlugin = function() {
      if (!pluginList.length)
        return nextImportUrl(resolve, reject);

      var plugin = pluginList.shift();
      var descriptor = environment.requireModule(plugin[0])['default'];
      if (!descriptor) {
        return reject(new AxiomError.Runtime(
            'No descriptor exported by: ' + plugin[0]));
      }

      var module = environment.defineModule(descriptor);
      cx.stdout('New module: ' + module.moduleId + '\n');

      var main = environment.requireModule(plugin[1])['default'];
      if (!main) {
        return reject(new AxiomError.Runtime(
            'No main exported by: ' + plugin[1]));
      }

      try {
        return main(module, { sourceUrl: e.target.import.URL }).then(
            function() {
              cx.stdout('Module ready.\n');
              return nextPlugin();
            }).catch(function(err) {
              return reject(err);
            });
      } catch(err) {
        return reject(err);
      }
    };

    return nextPlugin();
  };

  var nextImportUrl = function(resolve, reject) {
    if (!cx.arg._.length)
      resolve(null);

    var url = cx.arg._.shift();
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
  };

  return new Promise(function(resolve, reject) {
    cx.ready();

    if (!cx.arg._.length)
      return reject(new AxiomError.Missing('url'));

    nextImportUrl(resolve, reject);
  });
};

export default main;

main.argSigil = '%';
