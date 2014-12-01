// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Polymer('axiom-anchors', {
  created: function () {
    this.anchor = this.anchor.bind(this);
  },
  anchor: function (position) {
    return this.$[position + "-anchor"];
  }
});
