// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
