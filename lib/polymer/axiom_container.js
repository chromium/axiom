// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Polymer('axiom-container', {
  created: function () {
    this.anchorsElement = this.anchorsElement.bind(this);
    this.setAttribute("relative", "");
  },
  attached: function() {
    if (this.parentElement) {
      if (this.parentElement.hasAttribute("DEBUG")) {
        this.setAttribute("DEBUG", "");
      }
    }
  },
  anchorsElement: function () {
    return this.$.anchors;
  },
});