// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export var descriptor = {
  'id': 'axiom',
  'version': '1.0.0',

  'provides': {
    'filesystems': {
      /*
      'service-binding': {
        // Create an alias to a path.
        'alias': {'type': 'method', 'args': ['pathSpecFrom', 'pathSpecTo']},

        // Create an open or execute context.
        'createContext': {'type': 'method',
                          'args': ['contextType', 'pathSpec', 'arg']},

        // Return an array of stat metadata for each entry in a directory.
        'list': {'type': 'method', 'args': ['pathSpec']},

        // Make a new directory.
        'mkdir': {'type': 'method', 'args': ['pathSpec']},

        // Move an entry from one location to another.
        'move': {type: 'method', args: ['pathSpecFrom', 'pathSpecTo']},

        // Get metadata for a path.
        'stat': {'type': 'method', 'args': ['pathSpec']},

        // Remove a path.
        'unlink': {'type': 'method', 'args': ['pathSpec']},
      },

      'extension-descriptor': {
        'define-filesystems': {'type': 'map'}
      },

      'extension-binding': {
        'fileSystemBindings': {'type': 'map'},
      }
      */
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
        'define-args': {'type': 'map'},
        /**
         * Add to the list of known commands.
         */
        'define-commands': {'type': 'map'}
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
      'service-binding': {
        'register': {'type': 'method', 'args': ['id', 'tagName']},
        'unregister': {'type': 'method', 'args': ['id']},
      },

      'extension-descriptor': {
        'define-views': {'type': 'map'}
      },

      'extension-binding': {
        'getAttrs': {},
        'show': {'type': 'method', 'args': []},
        'hide': {'type': 'method'}
      }
    }
  }
};

export default descriptor;
