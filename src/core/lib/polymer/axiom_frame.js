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

(function () {
  // When entering a view, highlight dropzones of the view and all its parent
  // container and frames.
  // When leaving a view, hide dropzones of the view and all its parent
  // container and frames.
  // When hovering over a dropzone, show the corresponding view frame
  var DragDropState = function (frame, view) {
    this.frame = frame;
    this.view = view;
    this.currentView = null;
    this.currentDropFrame = null;

    this.currentElement = null;
    this.currentDropZones = [];
  }

  DragDropState.prototype.dragStart = function() {
  }

  DragDropState.prototype.dragEnd = function() {
    // Hide active drop zones.
    for(var i = 0; i < this.currentDropZones.length; i++) {
      this.currentDropZones[i].dropZones().setAttribute("hidden", "");
    }
    this.currentDropZones = [];
  }

/*
  DragDropState.prototype.getElementInPath = function(path, tagName) {
    for (var i = 0; i < path.length; i++) {
      if (path[i].tagName === tagName) {
        return path[i];
      }
    }
    return null;
  }

  DragDropState.prototype.getDropZone = function(path) {
    return this.getElementInPath(path, 'AXIOM-DROP-ZONE')
  }

  DragDropState.prototype.getView = function(path) {
    return this.getElementInPath(path, 'AXIOM-VIEW')
  }

  DragDropState.prototype.enterDropZone = function(dropZone) {
    if (dropZone === this.currentDropZone) {
      return;
    }
    console.log("enterDropZone", dropZone);

    //dropZone.parentElement.showDropFrame(dropZone);

    this.currentDropZone = dropZone;
    //this.currentDropFrame = dropZone.parentElement.dropFrame(dropZone.position);

    // Show frame corresponding to drop zone
    //this.currentDropFrame.removeAttribute("hidden");
  }

  DragDropState.prototype.leaveDropZone = function() {
    if (!this.currentDropZone) {
      return;
    }
    console.log("leaveDropZone", this.currentDropZone);

    // Hide currently active frame
    if (this.currentDropFrame) {
      this.currentDropFrame.setAttribute("hidden", "");
    }

    this.currentDropZone = null;
    this.currentDropFrame = null;
  }

  DragDropState.prototype.enterView = function(view) {
    if (view === this.currentView) {
      return;
    }
    console.log("enterView", view);

    this.currentView = view;

    // Show drop zones of parent chain
    for(var parent = this.currentView; parent; parent = parent.parentElement) {
      if (parent.dropZones) {
        parent.dropZones().removeAttribute("hidden");
      }
    }
  }

  DragDropState.prototype.leaveView = function() {
    if (!this.currentView) {
      return;
    }
    console.log("leaveView", this.currentView);

    // Hide drop zones of parent chain
    for(var parent = this.currentView; parent; parent = parent.parentElement) {
      if (parent.dropZones) {
        parent.dropZones().setAttribute("hidden", "");
      }
    }

    this.currentView = null;
  }
*/

  // Return an array of elements with drop zones from [path].
  DragDropState.prototype.getDropZones = function(path) {
    result = [];
    for(var i = path.length - 1; i >=0; i--) {
      var elem = path[i];
      if (elem.dropZones) {
        result.push(elem);
      }
    }
    return result;
  }

  DragDropState.prototype.dragLeave = function(path) {
    /*
    var elem = this.currentElement;
    if (elem === null)
      return;
    this.currentElement = null;

    for(; elem != null; elem = elem.parentElement) {
      if (elem.dropZones) {
        elem.dropZones().setAttribute("hidden", "");
      }
    }
    */
  }


  DragDropState.prototype.dragEnter = function(path) {
    var currentPath = this.currentDropZones;
    var newPath = this.getDropZones(path);
    //console.log("currentPath: ", currentPath);
    //console.log("newPath: ", newPath);
    var lastCommonParent = -1;
    for (var i = 0; i < Math.min(currentPath.length, newPath.length); i++) {
      if (currentPath[i] === newPath[i]) {
        lastCommonParent = i;
      } else {
        break;
      }
    }

    //console.log("Hiding elements from " + (lastCommonParent + 1) + ' to ' +
    //  (currentPath.length - 1) + " and showing elements from " + (lastCommonParent + 1) +
    //  " to " + (newPath.length - 1));
    for(i = lastCommonParent + 1; i < currentPath.length; i++) {
      currentPath[i].dropZones().setAttribute("hidden", "");
    }

    for(i = lastCommonParent + 1; i < newPath.length; i++) {
      newPath[i].dropZones().removeAttribute("hidden");
    }
    this.currentDropZones = newPath;
  }

  DragDropState.prototype.dragOver = function(path) {
    /*
    this.dragOverDropZone(path);
    this.dragOverView(path);
    */
  }

/*
  DragDropState.prototype.dragOverDropZone = function(path) {

      var dropZone = this.getDropZone(path);
      if (!dropZone) {
        this.leaveDropZone();
        return;
      }
      if (dropZone !== this.currentDropZone) {
        this.leaveDropZone();
        this.enterDropZone(dropZone);
      }
  }

  DragDropState.prototype.dragOverView = function(path) {
      var view = this.getView(path);
      if (!view) {
        this.leaveView();
        return;
      }
      if (view !== this.currentView) {
        this.leaveView();
        this.enterView(view);
      }
  }
  */

  Polymer('axiom-frame', {
    created: function () {
      this.anchorsElement = this.anchorsElement.bind(this);
      this.dropZones = this.dropZones.bind(this);
      this.setAttribute('relative', '');
    },
    ready: function () {
      /*
      function getPathString(event) {
        var s = "";
        s = event.path[0].tagName;
        for(var i = 1; i < event.path.length; i++) {
          var elem = event.path[i];
          if (elem.tagName && elem.tagName.substr(0, 5) === "AXIOM") {
            if (s !== "")
              s += ", "
            s += elem.tagName;
          }
        }
        return '[' +  s + ']';
      }
      */

      document.addEventListener('dragstart', function (event) {
        //console.log('dragstart', event);
        this.dragStart(event);
      }.bind(this), false);

      document.addEventListener('dragend', function (event) {
        //console.log('dragend', event);
        this.dragEnd(event);
      }.bind(this), false);

      /* events fired on the draggable target */
      document.addEventListener('drag', function (event) {
        //console.log('drag', event);
        //this.drag(event);
      }.bind(this), false);

      /* events fired on the drop targets */
      document.addEventListener('dragover', function (event) {
        //console.log('dragover', event);
        //console.log('******** dragover ***********', event);
        //this.dragOver(event);
        event.preventDefault();
      }.bind(this), false);

      document.addEventListener('dragenter', function (event) {
        //console.log('dragenter: ' + getPathString(event), event);
        //console.log('dragenter: ' + getPathString(event), event);
        //console.log('dragenter', event);
        this.dragEnter(event);
      }.bind(this), false);

      document.addEventListener('dragleave', function (event) {
        //console.log('dragleave: ' + getPathString(event), event);
        //console.log('dragleave: ' + getPathString(event), event);
        //this.dragLeave(event);
      }.bind(this), false);

      document.addEventListener('drop', function (event) {
        //console.log('drop', event);
        this.drop(event);
      }.bind(this), false);
    },

    // Keep a reference to the current drop-drop state.
    dragDropState: null,

    anchorsElement: function () {
      return this.$.anchors;
    },

    dropZones: function () {
      return this.$['drop-zones'];
    },

    dragStart: function (event) {
      if (event.target.tagName !== 'AXIOM-VIEW')
        return;
      var view = event.target;

      // Use state to keep track of current drag-drop operation.
      this.dragDropState = new DragDropState(this, view);
      this.dragDropState.dragStart();

      // make the view half transparent
      view.style.opacity = .5;

      // This causes the drag-drop operation to be canceled.
      //this['view-manager'].detachView(event.target, window.document.body);

      // Fire custom 'drag-start' event
      this.fire('drag-start', { view: view });
    },

    dragEnd: function (event) {
      this.dragLeave(event);
      event.target.style.opacity = '';

      // Done with this operation.
      this.dragDropState.dragEnd();
      this.dragDropState = null;

      // Fire custom 'drag-end' event
      var view = event.target;
      this.fire('drag-end', { view: view });
    },

    dragEnter: function (event) {
      // prevent default to allow drop
      event.preventDefault();

      if (this.dragDropState) {
        this.dragDropState.dragEnter(event.path);
      }
      //var targetElement = this.getElementInPath(event, 'AXIOM-VIEW');
      //if (!targetElement)
      //  return null;
      //targetElement.dragEnter();
    },

    dragLeave: function (event) {
      //var targetElement = this.getElementInPath(event, 'AXIOM-VIEW');
      //if (!targetElement)
      //  return null;
      //targetElement.dragLeave();
    },

    drag: function (event) {
    },

    dragOver: function (event) {
      // prevent default to allow drop
      event.preventDefault();

      if (this.dragDropState) {
        this.dragDropState.dragOver(event.path);
      }

      // Update current anchor if needed
      //var currentAnchor = this.dragDropState.currentAnchor;
      //var anchor = this.getTargetAnchor(event);
      //if (anchor === null) {
      //  if (currentAnchor !== null) {
      //    currentAnchor.anchor.setAttribute('hidden', '');
      //  }
      //  this.dragDropState.currentAnchor = null;
      //  event.dataTransfer.dropEffect = 'none';
      //  return;
      //}

      //event.dataTransfer.dropEffect = 'move';
      //if (anchor === currentAnchor)
      //  return;

      //if (currentAnchor !== null) {
      //  currentAnchor.anchor.setAttribute('hidden', '');
      //}
      //anchor.anchor.removeAttribute('hidden');
      //this.dragDropState.currentAnchor = anchor;
    },

    drop: function (event) {
      // prevent default action (open as link for some elements)
      event.preventDefault();

      //var location = this.getTargetAnchor(event);
      //if (!location) {
      //  return;
      //}

      //var view = this.dragDropState.view;
      //this.fire('drop-view', {
      //  view: view,
      //  target: location.target,
      //  targetPosition: location.position,
      //});

      // Note: 'dragend' is not fired when the element is removed.
      //this.dragEnd(event);
    },

/*
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
      var result = this.getAnchorLocation(event, 'AXIOM-FRAME', 8);
      if (!result)
        result = this.getAnchorLocation(event, 'AXIOM-CONTAINER', 12);
      if (!result)
        result = this.getAnchorLocation(event, 'AXIOM-VIEW', 16);
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
      // Note: we test for 'children.length === 3' because of the splitter
      //       element between the actual 2 children.
      if (targetElement.tagName === 'AXIOM-CONTAINER' &&
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
        anchor = getAnchorInRect(event, targetElement,
          newRect(rect.left, rect.top, offset, rect.height), 'left');
      if (!anchor)
        anchor = getAnchorInRect(event, targetElement,
          newRect(rect.left, rect.top, rect.width, offset), 'top');
      if (!anchor)
        anchor = getAnchorInRect(event, targetElement,
          newRect(rect.right - offset, rect.top, offset, rect.height), 'right');
      if (!anchor)
        anchor = getAnchorInRect(event, targetElement,
          newRect(rect.left, rect.bottom - offset, rect.width, offset), 'bottom');
      return anchor;
    },
*/
  });
})();
