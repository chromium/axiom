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

import JsFileSystem from 'axiom/fs/js_file_system';

import descriptor from 'axiom_editor/descriptor';
import executables from 'axiom_editor/executables';

export var main = function(module) {
  return new Promise(function(resolve, reject) {
    var myFileSystemBinding = module.getExtensionBinding('filesystems@axiom');
    var jsfs = new JsFileSystem(null, myFileSystemBinding);
    return jsfs.mkdir('exe').then(function(jsdir) {
      jsdir.install(executables);
      return resolve(null);
    });
  });
};

export default main;
