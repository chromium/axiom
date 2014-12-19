// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Polymer('axiom-drop-zone', {
  ready: function() {
    function getPathString(event) {
      var s = "";
      s = event.path[0].tagName;
      for(var i = 1; i < event.path.length; i++) {
        var elem = event.path[i];
        //if (elem.tagName && elem.tagName.substr(0, 5) === "AXIOM") {
          if (s !== "")
            s += ", "
          s += elem.tagName;
        //}
      }
      return '[' +  s + ']';
    }
    var lastDragOver = null;
    this.addEventListener('dragenter', function(e) {
      console.log("dragenter[drop-zone]: " + getPathString(e), this);
      e.target.setAttribute("highlight", "");
      lastDragOver = null;
      e.preventDefault();
    });
    this.addEventListener('dragleave', function(e) {
      console.log("dragleave[drop-zone]: " + getPathString(e), this);
      e.target.removeAttribute("highlight");
      lastDragOver = null;
    });
    this.addEventListener('dragover', function(e) {
      if (lastDragOver === this)
        return;
      console.log("dragover[drop-zone]: " + getPathString(e), this);
      lastDragOver = this;

      //e.preventDefault();
    });
  },
  computed: {
    arrowtype: '(position == "top" || position == "right") ? "up" : "down"',
    orientation: '(position == "top" || position == "bottom") ? "horizontal" : "vertical"',
  },
});
