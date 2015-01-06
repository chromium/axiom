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
    this.headerElement = this.headerElement.bind(this);
    this.enterDragMode = this.enterDragMode.bind(this);
    this.leaveDragMode = this.leaveDragMode.bind(this);
    this.onTitleMouseEnter = this.onTitleMouseEnter.bind(this);
    this.onTitleMouseLeave = this.onTitleMouseLeave.bind(this);
    this.setAttribute('relative', '');
  },
  attached: function () {
    if (this.parentElement) {
      if (this.parentElement.hasAttribute('DEBUG')) {
        this.setAttribute('DEBUG', '');
      }
    }
    this.$.title.addEventListener("mouseenter", this.onTitleMouseEnter);
    this.$.title.addEventListener("mouseleave", this.onTitleMouseLeave);
  },
  detached: function() {
    this.$.title.removeEventListener("mouseenter", this.onTitleMouseEnter);
    this.$.title.removeEventListener("mouseleave", this.onTitleMouseLeave);
  },
  ready: function() {
    this.$.closeicon.addEventListener('click', function() {
      this.fire('close');
    }.bind(this));
  },
  onTitleMouseEnter: function(event) {
    //console.log('onTitleMouseEnter', event);
    this.fire("title-enter", { view: this});
  },
  onTitleMouseLeave: function(event) {
    //console.log('onTitleMouseLeave', event);
    this.fire("title-leave", { view: this});
  },
  // Used by drag-drop to track active drop anchor
  anchorsElement: function() {
    return this.$.anchors;
  },
  // Used by drag-drop to access the drop zones
  dropZones: function () {
    return this.$['drop-zones'];
  },
  // Used by drag-drop to access the view header for drag-drop.
  headerElement: function() {
    return this.$.header;
  },
  // Called by view manager when entering drag mode.
  enterDragMode: function() {
    // Make view top-most so that we receive all mouse events. We need this in
    // case our element is overlayed by some other element (e.g. a iframe).
    this.style.zIndex = '200';

    // Prevent children from receiving mouse events to ensure mouse events
    // are realiably dispatched to us (and our parents).
    for(var child = this.firstElementChild; child !== null; child = child.nextElementSibling) {
      child.style.pointerEvents = 'none';
    }
  },
  // Called by view manager when leaving drag mode.
  leaveDragMode: function() {
    this.style.zIndex = '';
    for(var child = this.firstElementChild; child !== null; child = child.nextElementSibling) {
      child.style.pointerEvents = '';
    }
  },
});
