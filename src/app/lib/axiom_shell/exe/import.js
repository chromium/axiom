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
      var descriptor;
      try {
        descriptor = environment.requireModule(plugin[0])['default'];
      } catch (ex) {
        return reject(ex);
      }

      if (!descriptor) {
        return reject(new AxiomError.Runtime(
            'No descriptor exported by: ' + plugin[0]));
      }

      var main;
      try {
        main = environment.requireModule(plugin[1])['default'];
      } catch (ex) {
        return reject(ex);
      }

      if (!main) {
        return reject(new AxiomError.Runtime(
            'No main exported by: ' + plugin[1]));
      }

      var module;
      try {
        module = environment.defineModule(descriptor);
        cx.stdout('New module: ' + module.moduleId + '\n');
      } catch(ex) {
        reject(ex);
      }

      try {
        return main(module, { sourceUrl: e.target.import.URL }).then(
            function() {
              cx.stdout('Module ready.\n');
              return nextPlugin();
            }).catch(function(err) {
              return reject(err);
            });
      } catch(ex) {
        return reject(ex);
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
