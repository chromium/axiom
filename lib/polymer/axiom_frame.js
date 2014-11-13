// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var DragDropState = function (frame, view) {
  this.frame = frame;
  this.view = view;
  this.currentContainer = null;
  this.currentView = null;
  this.currentAnchor = null;
}

Polymer('axiom-frame', {
  created: function () {
    this.anchorsElement = this.anchorsElement.bind(this);
    this.setAttribute("relative", "");
    this["view-manager"] = new ViewManager(this);
  },
  ready: function () {
    document.addEventListener("dragstart", function (event) {
      console.log("dragstart", event);
      this.dragStart(event);
    }.bind(this), false);

    document.addEventListener("dragend", function (event) {
      console.log("dragend", event);
      this.dragEnd(event);
    }.bind(this), false);

    /* events fired on the draggable target */
    document.addEventListener("drag", function (event) {
      console.log("drag", event);
    }.bind(this), false);

    /* events fired on the drop targets */
    document.addEventListener("dragover", function (event) {
      console.log("dragover", event);
      this.dragOver(event);
    }.bind(this), false);

    document.addEventListener("dragenter", function (event) {
      console.log("dragenter", event);
      this.dragEnter(event);
    }.bind(this), false);

    document.addEventListener("dragleave", function (event) {
      console.log("dragleave", event);
      this.dragLeave(event);
    }.bind(this), false);

    document.addEventListener("drop", function (event) {
      console.log("drop", event);
      this.drop(event);
    }.bind(this), false);
  },

  // Keep a reference to the current drop-drop state.
  dragDropState: null,

  anchorsElement: function () {
    return this.$.anchors;
  },

  dragStart: function(event) {
    if (event.target.tagName !== "AXIOM-VIEW")
      return;

    // Use state to keep track of current drag-drop operation.
    this.dragDropState = new DragDropState(this, event.target);

    // make the view half transparent
    event.target.style.opacity = .5;

    // This causes the drag-drop operation to be canceled.
    //this["view-manager"].detachView(event.target, window.document.body);
  },

  dragEnd: function (event) {
    this.dragLeave(event);
    event.target.style.opacity = "";

    // Done with this operation.
    if (this.dragDropState && this.dragDropState.currentAnchor)
      this.dragDropState.currentAnchor.anchor.setAttribute("hidden", "")

    this.dragDropState = null;
  },

  dragEnter: function (event) {
  },

  dragLeave: function (event) {
  },

  dragOver: function(event) {
    // prevent default to allow drop
    event.preventDefault();

    // Update current anchor if needed
    var currentAnchor = this.dragDropState.currentAnchor;
    var anchor = this.getTargetAnchor(event);
    if (anchor === null) {
      if (currentAnchor !== null) {
        currentAnchor.anchor.setAttribute("hidden", "");
      }
      this.dragDropState.currentAnchor = null;
      event.dataTransfer.dropEffect = "none";
      return;
    }

    event.dataTransfer.dropEffect = "move";
    if (anchor === currentAnchor)
      return;

    if (currentAnchor !== null) {
      currentAnchor.anchor.setAttribute("hidden", "");
    }
    anchor.anchor.removeAttribute("hidden");
    this.dragDropState.currentAnchor = anchor;
  },

  drop: function (event) {
    // prevent default action (open as link for some elements)
    event.preventDefault();

    var location = this.getTargetAnchor(event);
    if (!location) {
      return;
    }

    var view = this.dragDropState.view;
    this["view-manager"].moveView(view, location.target, location.position);

    // Note: "dragend" is not fired when the element is removed.
    this.dragEnd(event);
  },

  getElementInPath: function (event, tagName) {
    var path = event.path;
    for (var i = 0; i < path.length; i++) {
      if (path[i].tagName === tagName) {
        return path[i];
      }
    }
    return null;
  },

  getTargetAnchor: function (event) {
    var result = this.getAnchorLocation(event, "AXIOM-FRAME", 8);
    if (!result)
      result = this.getAnchorLocation(event, "AXIOM-CONTAINER", 12);
    if (!result)
      result = this.getAnchorLocation(event, "AXIOM-VIEW", 16);
    return result;
  },

  getAnchorLocation: function (event, tagName, offset) {
    var targetElement = this.getElementInPath(event, tagName);
    if (!targetElement)
      return null;

    // Don't show anchors on the view being dragged.
    if (this.dragDropState && this.dragDropState.view === targetElement) {
      return null;
    }

    // Dont' show anchors on the parent container if it has exactly
    // 2 children (as it would be deleted during the drop operation)
    // Note: we test for "children.length === 3" because of the splitter
    //       element between the actual 2 children.
    if (targetElement.tagName === "AXIOM-CONTAINER" &&
        targetElement.children.length === 3 &&
        this.dragDropState &&
        this.dragDropState.view &&
        this.dragDropState.view.parentElement === targetElement) {
      return null;
    }

    function isInsideRect(rect, x, y) {
      return (rect.left <= x && x < rect.right &&
        rect.top <= y && y <= rect.bottom);
    }

    function newRect(left, top, width, height) {
      return {
        left: left,
        top: top,
        right: left + width,
        bottom: top + height,
        width: width,
        height: height,
      };
    }

    function getAnchorInRect(event, targetElement, rect, position) {
      if (!isInsideRect(rect, event.clientX, event.clientY))
        return null;

      anchor = targetElement.anchorsElement().anchor(position);
      if (!anchor)
        return null;
      return {
        'anchor': anchor,
        'target': targetElement,
        'position': position,
      };
    }

    var rect = targetElement.getBoundingClientRect();
    var anchor = null;
    if (!anchor)
      anchor = getAnchorInRect(event, targetElement, newRect(rect.left, rect.top, offset, rect.height), "left");
    if (!anchor)
      anchor = getAnchorInRect(event, targetElement, newRect(rect.left, rect.top, rect.width, offset), "top");
    if (!anchor)
      anchor = getAnchorInRect(event, targetElement, newRect(rect.right - offset, rect.top, offset, rect.height), "right");
    if (!anchor)
      anchor = getAnchorInRect(event, targetElement, newRect(rect.left, rect.bottom - offset, rect.width, offset), "bottom");
    return anchor;
  },
});
