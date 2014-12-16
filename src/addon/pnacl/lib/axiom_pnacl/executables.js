// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import environment from 'axiom_shell/environment';

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
