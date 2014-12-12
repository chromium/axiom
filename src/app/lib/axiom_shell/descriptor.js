// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export var descriptor = {
  'id': 'axiom_shell',
  'version': '1.0.0',
  'requires': ['axiom^1.0.0'],
  'extends': {
    'filesystems@axiom': {
    },

    'views@axiom': {
      'define-views': {
        'console': null
      }
    },

    'windows@axiom': {
      'createWindow': {}
    },

    'commands@axiom': {
      'define-commands': {
        'launch-app': {}
      },
    }
  }
};

export default descriptor;
