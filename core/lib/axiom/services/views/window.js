// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export var Window = function(id, options) {
  this.containers_ = {};
};

export default Window;

Window.prototype.show = function() {};

Window.prototype.hide = function() {};

Window.prototype.createContainer = function(options) {};

Window.prototype.getContainer = function(id) {};
