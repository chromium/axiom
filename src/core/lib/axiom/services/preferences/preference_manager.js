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

/**
 * Registry of preference (name, type, default-value, current-value).
 */
export var PreferenceManager = function() {

};

export default PreferenceManager;

PreferenceManager.prototype.bind = function(serviceBinding) {
  serviceBinding.bind(this, {
    'onExtend': this.onExtend
  });

  serviceBinding.ready();
};

/**
 * Extending the preference manager adds to the list of known preferences.
 *
 * The descriptor should be of the form:
 *   {
 *    // Preference types used to track lists of things.
 *    'define-child': [
 *      [child-name,
 *        {pref-name-C1: [default-value, pref-type],
 *         ...
 *         pref-name-Cn: [default-value, pref-type]
 *        },
 *      ],
 *      ...
 *    ],
 *
 *    // Preferences stored only on the local machine.
 *    'define-local': {
 *      pref-name-L1: ([default-value, pref-type] | child-name),
 *      ...
 *      pref-name-Ln: ([default-value, pref-type] | child-name)
 *    },
 *
 *    // Preferences sync'd across multiple machines.
 *    'define-sync': {
 *      pref-name-S1: ([default-value, pref-type] | child-name),
 *      ...
 *      pref-name-Sn: ([default-value, pref-type] | child-name)
 *    },
 *  }
 *
 * No extension binding is necessary.
 *
 * NOTE(rginda): Maybe we add a binding later to allow extensions to manage
 * pref storage on their own and only use the pref manager as a way to leverage
 * the pref manager's read/write interface.
 */
PreferenceManager.prototype.onExtend = function(extension) {

};
