// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Polymer('axiom-drop-zone', {
  computed: {
    // Compute [arrowtype] and [orientation] so that they can be used
    // in template binding.
    arrowtype: '(position == "top" || position == "right") ? "up" : "down"',
    orientation: '(position == "top" || position == "bottom") ? "horizontal" : "vertical"',
  },
});
