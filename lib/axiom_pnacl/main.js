// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import JsFileSystem from 'axiom/fs/js_file_system';

import descriptor from 'axiom_pnacl/descriptor';
import executables from 'axiom_pnacl/executables';

export var main = function(module, options) {
  options = options || {};
  return new Promise(function(resolve, reject) {
    var myFileSystemBinding = module.getExtensionBinding('filesystems@axiom');
    var jsfs = new JsFileSystem(null, myFileSystemBinding);
    return jsfs.mkdir('exe').then(function(jsdir) {
      jsdir.install(executables(options.sourceUrl));
      return resolve(null);
    });
  });
};

export default main;
