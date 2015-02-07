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
import environment from 'shell/environment';

var import_ = {};

import_.main = function(cx) {
  var onImportLoaded = function(url, resolve, reject, e) {
    var document = e.target.import;

    var process = function() {
      return import_.processAddonNodes(cx, url, document).then(
        function() {
          nextImportUrl(resolve, reject);
        }).catch(reject);
    };

    if (cx.arg['save'])
      return import_.saveImport(url).then(process).catch(process);

    return process();
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
                          onImportLoaded.bind(null, url, resolve, reject));

    document.head.appendChild(link);
  };

  return new Promise(function(resolve, reject) {
    cx.ready();

    if (!cx.arg._.length)
      return reject(new AxiomError.Missing('url'));

    nextImportUrl(resolve, reject);
  });
};

export default import_.main;

import_.main.argSigil = '%';

import_.processAddonNodes = function(cx, sourceUrl, document) {
  // There could be multiple x-axiom-plugin nodes in this import.
  var addonNodes = document.querySelectorAll('x-axiom-addon');

  var addonList = [];
  // Find them all, sanity check them, and add to a list of plugins to
  // process.
  for (var i = 0; i < addonNodes.length; i++) {
    var addonNode = addonNodes[i];
    var desc = addonNode.getAttribute('x-descriptor-module');
    if (!desc) console.log('Missing x-descriptor-module');

    var main = addonNode.getAttribute('x-main-module');
    if (!main) console.log('Missing x-main-module');

    if (desc && main) addonList.push([desc, main]);
  }

  var nextAddon = function() {
    if (!addonList.length)
    return Promise.resolve(null);

    var ary = addonList.shift();
    return import_.initializeAddon(sourceUrl, ary[0], ary[1]).then(
      function(module) {
        cx.stdout('New addon: ' + module.moduleId + '\n');
        return nextAddon();
      });
  };

  return nextAddon();
};

import_.initializeAddon = function(
    sourceUrl, descriptorModuleName, mainModuleName) {
  var descriptor;
  try {
    descriptor = environment.requireModule(descriptorModuleName)['default'];
  } catch (ex) {
    return Promise.reject(ex);
  }

  if (!descriptor) {
    return Promise.reject(new AxiomError.Runtime(
        'No descriptor exported by: ' + descriptorModuleName));
  }

  var main;
  try {
    main = environment.requireModule(mainModuleName)['default'];
  } catch (ex) {
    return Promise.reject(ex);
  }

  if (!main) {
    return Promise.reject(new AxiomError.Runtime(
        'No main exported by: ' + mainModuleName));
  }

  var module;
  try {
    module = environment.defineModule(descriptor);
  } catch(ex) {
    return Promise.reject(ex);
  }

  try {
    return main(module, { sourceUrl: sourceUrl }).then(
      function() {
        return Promise.resolve(module);
      }).catch(function(err) {
        return Promise.reject(err);
      });
  } catch(ex) {
    return Promise.reject(ex);
  }
};

import_.saveImport = function(url) {
  var axiomJson = '/mnt/html5/home/.axiom.json';
  var fs = environment.getServiceBinding('filesystems@axiom');

  var overwrite = function(value) {
    if (value['import'] instanceof Array) {
      if (value['import'].indexOf(url) != -1)
        return Promise.resolve();

      value['import'].push(url);
    } else {
      value['import'] = [url];
    }

    return fs.writeFile(axiomJson, {truncate: true, create: true},
                        {dataType: 'utf8-string',
                         data: JSON.stringify(value, null, '  ') + '\n'
                        });
  };

  var read = function() {
    return fs.readFile(axiomJson, {}, {}).then(
      function(result) {
        var value;

        try {
          value = JSON.parse(result.data);
        } catch (ex) {
          value = {};
        }

        if (typeof value != 'object' || value instanceof Array)
          return Promise.resolve({});

        return Promise.resolve(value);
      }
    ).catch(
      function(err) {
        return Promise.resolve({});
      }
    );
  };

  return read().then(overwrite).catch(overwrite);
};
