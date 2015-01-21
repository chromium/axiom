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

import PnaclCommand from 'axiom_pnacl/pnacl_command';

// @note ExecuteContext from 'axiom/bindings/fs/execute_context'

var createCommand = function(name, sourceUrl, opt_tarFilename, opt_env) {
  var command = new PnaclCommand(name, sourceUrl, opt_tarFilename, opt_env);
  return command.run.bind(command);
};

export var executables = function(sourceUrl) {
  return {
    'curl(@)': createCommand('curl', sourceUrl),
    'nano(@)': createCommand('nano', sourceUrl, 'nano.tar'),
    'nethack(@)': createCommand('nethack', sourceUrl, 'nethack.tar'),
    'python(@)':
        // Note: We set PYTHONHOME to '/' so that the python library files
        // are loaded from '/lib/python2.7', which is the prefix path used in
        // 'pydata_pnacl.tar'. By default, python set PYTHONHOME to be the
        // prefix of the executable from arg[0]. This conflicts with the way
        // we set arg[0] to tell pnacl to where to load the .tar file from.
        createCommand('python', sourceUrl, 'pydata_pnacl.tar', {
          '$PYTHONHOME': '/'
        }),
    'unzip(@)': createCommand('unzip', sourceUrl),
    'vim(@)': createCommand('vim', sourceUrl, 'vim.tar'),
  };
};

export default executables;
