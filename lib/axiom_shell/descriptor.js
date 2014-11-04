// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export var descriptor = {
  'id': 'axiom_shell',
  'version': '1.0.0',
  'requires': ['axiom^1.0.0'],
  'extends': {
    'filesystems@axiom': {
      'define-filesystems': {
        'exe': null,
        'proc': null,
        'domfs': null,
      }
    },

    'views@axiom': {
      'define-views': {
        'console': null
      }
    },

    'commands@axiom': {
      'define-commands': {
        'launch-app': {}
      },
    }
  }
};

export default descriptor;
