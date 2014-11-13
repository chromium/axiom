// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function () {
  var AXIOM_FRAME = "AXIOM-FRAME";
  var AXIOM_VIEW = "AXIOM-VIEW";
  var VIEW_MANAGER = "view-manager";

  function getViewManager(element) {
    var parent = element;
    while (parent !== null) {
      if (parent.tagName === AXIOM_FRAME) {
        return parent[VIEW_MANAGER];
      }
      parent = parent.parentElement;
    }
    return null;
  }

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
    ready: function () {
      //
      function onCloseIconClick(e) {
        console.log("close-click: tag=" + this.tagName);
        var view = this;
        getViewManager(this).detachView(view);
      }
      //
      this.$.closeicon.addEventListener('click', onCloseIconClick.bind(this));
    },
    anchorsElement: function () {
      return this.$.anchors;
    },
  });
})();
