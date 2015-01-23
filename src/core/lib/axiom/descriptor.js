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

var descriptor = {
  'id': 'axiom',
  'version': '1.0.0',

  'provides': {
    'filesystems': {
      'service-binding': {
        'alias': {'type': 'method'},
        'createExecuteContext': {'type': 'method'},
        'createOpenContext': {'type': 'method'},
        'list': {'type': 'method'},
        'mkdir': {'type': 'method'},
        'move': {'type': 'method'},
        'readFile': {'type': 'method'},
        'writeFile': {'type': 'method'},
        'stat': {'type': 'method'},
        'unlink': {'type': 'method'},
      },

      'extension-descriptor': {
        'define-filesystems': {'type': 'map'}
      },

      'extension-binding': {
        'alias': {'type': 'method'},
        'createExecuteContext': {'type': 'method'},
        'createOpenContext': {'type': 'method'},
        'list': {'type': 'method'},
        'mkdir': {'type': 'method'},
        'move': {'type': 'method'},
        'stat': {'type': 'method'},
        'unlink': {'type': 'method'},
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

    'windows': {
      'service-binding': {
        /**
         * Call this open a window given its id.
         */
        'openWindow': {'type': 'method', 'args': ['id']}
      },

      'extension-binding': {
        /**
         * The window manager calls this when a new window need to be created.
         */
        'createWindow': {'type': 'method', 'args': ['id']},
      }
    },

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
        'show': {'type': 'method', 'args': ['id', 'options']},
        'hide': {'type': 'method', 'args': ['id']},
      },

      'extension-descriptor': {
        /*
         * Add to the list of registered views.
         */
        'define-views': {'type': 'map'}
      },

      'extension-binding': {
        'getAttrs': {'type': 'method'},
        'onShow': {'type': 'event', 'args': []},
        'onHide': {'type': 'event', 'args': []}
      }
    }
  }
};

export {descriptor};
export default descriptor;
