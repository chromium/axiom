// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Polymer('axiom-view', {
  created: function() {
    this.anchorsElement = this.anchorsElement.bind(this);
    this.setAttribute("relative", "");
  },
  attached: function () {
    if (this.parentElement) {
      if (this.parentElement.hasAttribute("DEBUG")) {
        this.setAttribute("DEBUG", "");
      }
    }
  },
  ready: function() {
    this.$.closeicon.addEventListener('click', function() {
      this.fire("close");
    }.bind(this));
  },
  anchorsElement: function() {
    return this.$.anchors;
  },
});
