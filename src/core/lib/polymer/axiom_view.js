// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

Polymer('axiom-view', {
  created: function() {
    this.anchorsElement = this.anchorsElement.bind(this);
    this.dropZones = this.dropZones.bind(this);
    this.enterDragMode = this.enterDragMode.bind(this);
    this.leaveDragMode = this.leaveDragMode.bind(this);
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
  dragged: '',
  draggedChanged: function(oldValue, newValue) {
    if (newValue || newValue === "") {
      this.$.container.classList.add("dragged");
    } else {
      this.$.container.classList.remove("dragged");
    }
  },
  // Used by drag-drop to track active drop anchor
  anchorsElement: function() {
    return this.$.anchors;
  },
  // Used by drag-drop to access the drop zones
  dropZones: function () {
    return this.$['drop-zones'];
  },
  // Called by view manager when entering drag mode.
  enterDragMode: function() {
    this.$.container.style.zIndex = "200";
  },
  // Called by view manager when leaving drag mode.
  leaveDragMode: function() {
    this.$.container.style.zIndex = "0";
  },
});
