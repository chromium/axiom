// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * A container is a horizontal-box, vertical-box, or tab-strip which fits in
 * a window or another container, and contains views or other containers.
 */
export var Container = function(options) {
  this.options_ = options;
  this.views_ = {};
};

export default Container;

Container.prototype.addView = function(viewId) {};
