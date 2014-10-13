// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Registry of views that can be placed in windows.
 */
export var ViewManager = function() {

};

export default ViewManager;

/**
 * Extending the View Manager adds new view types.
 *
 * The extension descriptor should provide a unique id for each view.  The
 * binding should provide 'show' and 'hide' callbacks.
 */
ViewManager.prototype.extend = function(extension) {

};
