// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export var descriptor = {
  'id': 'axiom-services',
  'version': '1.0.0',

  'provides': {
    'filesystems': {
      /*
      'extension-descriptor': {
        'define-filesystems': {'type': 'array'}
      },
      */
      'extension-binding': {
        'get': {'type': 'method', 'args': []}
      }
    },

    'commands': {
      'service-binding': {
        /**
         * Call this to ask the command service to run a command.
         */
        'dispatch': {'type': 'method', 'args': ['name', 'arg']}
      },

      'extension-descriptor': {
        /**
         * Add to the list of known argument types.
         */
        'define-args': {'type': 'array'},
        /**
         * Add to the list of known commands.
         */
        'define-commands': {'type': 'array'}
      },

      'extension-binding': {
        /**
         * The command service will call this when it's time to run a command
         * provided by your extension.
         */
        'call': {'type': 'method', 'args': ['name', 'arg']}
      }
    },

    'windows': {},

    'prefs': {
      'extension-descriptor': {
        'define-children': {'type': 'array'},
        'define-sync': {'type': 'array'},
        'define-local': {'type': 'array'}
      },

      'extension-binding': null,

      'default-extension': {
        'define-children': [
          ['window',
           { 'geometry': null,
             'contents': null
           }
          ]
        ],

        'define-local': [
          ['open-windows', { 'type': 'child-list', 'child-type': 'window' }]
        ]
      }
    },

    'views': {
      'extension-descriptor': {
        'id': {'type': 'string'},
      },

      'extension-binding': {
        'show': {'type': 'function'},
        'hide': {'type': 'function'}
      }
    }
  }
};

export default descriptor;
