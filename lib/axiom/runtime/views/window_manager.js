// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Registry of opened windows.
 */
export var WindowManager = function() {

};

export default WindowManager;

/**
 * Not extensible?
 *
 * NOTE(rginda): Maybe extensions represent new window types?  We bake in html
 * windows, but an extension could provide chrome app windows?
 */
WindowManager.prototype.extend = function(extension) {

};
