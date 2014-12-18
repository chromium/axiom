// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Polymer('axiom-drop-zone', {
  computed: {
    arrowtype: '(location == "top" || location == "right") ? "up" : "down"'
  }
});
