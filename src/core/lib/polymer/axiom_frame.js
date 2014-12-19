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

  // Helper class used to track the state of an active drag & drop operation.
  var DragDropState = function (frame, view) {
    this.frame = frame;
    this.view = view;

    // Array of element with activate drop zones.
    this.currentDropZones = [];

    // There is no active drop target yet.
    this.activeDropTarget = null;
  }

  DragDropState.prototype.dragStart = function(path) {
    this.activateDropZones(path);
    this.activateDropTarget(path);
  }

  DragDropState.prototype.dragEnd = function() {
    // Hide active drop zones.
    for(var i = 0; i < this.currentDropZones.length; i++) {
      this.currentDropZones[i].dropZones().setAttribute("hidden", "");
    }
    this.currentDropZones = [];
    this.deactivateDropTarget();
  }

  DragDropState.prototype.dragEnter = function(path) {
    this.activateDropZones(path);
    this.activateDropTarget(path);
  }

  DragDropState.prototype.dragLeave = function(path) {
  }

  DragDropState.prototype.dragOver = function(path) {
  }

  // Return the first element of [path] with [tagName], or null if not found.
  DragDropState.prototype.getElementInPath = function(path, tagName) {
    for (var i = 0; i < path.length; i++) {
      if (path[i].tagName === tagName) {
        return path[i];
      }
    }
    return null;
  }

  // Return the first 'axiom-drop-zone' element of [path], or null if not found.
  DragDropState.prototype.getDropZone = function(path) {
    return this.getElementInPath(path, 'AXIOM-DROP-ZONE')
  }

  // Return an array of elements with drop zones from [path].
  DragDropState.prototype.getDropZones = function(path) {
    result = [];
    for(var i = path.length - 1; i >=0; i--) {
      var elem = path[i];
      if (elem.dropZones) {
        // The drop zones of the currently dragged view are not valid targets.
        if (elem !== this.view) {
          result.push(elem);
        }
      }
    }
    return result;
  }

  DragDropState.prototype.activateDropZones = function(path) {
    // Look for common drop zones container, hide the newly inactive ones,
    // show the newly active ones.

    // Look for the common ancestor (so we don't touch them)
    var currentPath = this.currentDropZones;
    var newPath = this.getDropZones(path);
    var lastCommonParent = -1;
    for (var i = 0; i < Math.min(currentPath.length, newPath.length); i++) {
      if (currentPath[i] === newPath[i]) {
        lastCommonParent = i;
      } else {
        break;
      }
    }

    // Hide the drop zones not active anymore
    for(i = lastCommonParent + 1; i < currentPath.length; i++) {
      currentPath[i].dropZones().setAttribute("hidden", "");
    }

    // Show the newly active drop zones
    for(i = lastCommonParent + 1; i < newPath.length; i++) {
      newPath[i].dropZones().removeAttribute("hidden");
    }

    // Update state for next call.
    this.currentDropZones = newPath;
  }

  DragDropState.prototype.activateDropTarget = function(path) {
    var dropZone = this.getDropZone(path);
    if (!dropZone) {
      this.deactivateDropTarget();
      return;
    }

    if (dropZone === this.currentDropZone) {
      return;
    }

    this.deactivateDropTarget();

    // Activate a new drop target
    var position = dropZone.position;
    var dropZones = this.getDropZones(path);
    var container = dropZones[dropZones.length - 1];
    var anchor = container.anchorsElement().anchor(position);
    anchor.removeAttribute("hidden");
    // Note: We need a value (not just empty string) for the attribute,
    // otherwise polymer won't detect changes to the attribute value.
    container.dropZones().zone(position).setAttribute("active", "1");

    this.activeDropTarget = {
      view: this.view,
      target: container,
      targetPosition: position
    };
  }

  DragDropState.prototype.deactivateDropTarget = function() {
    if (!this.activeDropTarget)
      return;

    var position = this.activeDropTarget.targetPosition;
    var container = this.activeDropTarget.target;
    var anchor = container.anchorsElement().anchor(position);
    anchor.setAttribute("hidden", "");
    container.dropZones().zone(position).removeAttribute("active");

    this.activeDropTarget = null;
  }

  Polymer('axiom-frame', {
    created: function () {
      this.anchorsElement = this.anchorsElement.bind(this);
      this.dropZones = this.dropZones.bind(this);
      this.setAttribute('relative', '');
    },
    ready: function () {
      // Note: dragstart, dragend and drag are fired on the *source* target
      document.addEventListener('dragstart', function (event) {
        this.dragStart(event);
      }.bind(this), false);

      document.addEventListener('dragend', function (event) {
        this.dragEnd(event);
      }.bind(this), false);

      document.addEventListener('drag', function (event) {
        this.drag(event);
      }.bind(this), false);

      // Note: dragover, dragenter, dragleave and drop are fired on the *destination*
      // target
      document.addEventListener('dragover', function (event) {
      // prevent default to allow drop
        event.preventDefault();
        this.dragOver(event);
      }.bind(this), false);

      document.addEventListener('dragenter', function (event) {
        // prevent default to allow drop
        event.preventDefault();
        this.dragEnter(event);
      }.bind(this), false);

      document.addEventListener('dragleave', function (event) {
        this.dragLeave(event);
      }.bind(this), false);

      document.addEventListener('drop', function (event) {
        // prevent default action (open as link for some elements)
        event.preventDefault();
        this.drop(event);
      }.bind(this), false);
    },

    // Keep a reference to the current drop-drop state.
    dragDropState: null,

    // Used by drag-drop to track active drop anchor
    anchorsElement: function () {
      return this.$.anchors;
    },
    // Used by drag-drop to access the drop zones
    dropZones: function () {
      return this.$['drop-zones'];
    },

    dragStart: function (event) {
      if (event.target.tagName !== 'AXIOM-VIEW')
        return;
      var view = event.target;

      // Use state to keep track of current drag-drop operation.
      this.dragDropState = new DragDropState(this, view);
      this.dragDropState.dragStart(event.path);

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
      if (this.dragDropState) {
        this.dragDropState.dragEnd();
        this.dragDropState = null;
      }

      // Fire custom 'drag-end' event
      var view = event.target;
      this.fire('drag-end', { view: view });
    },

    drag: function (event) {
    },

    dragEnter: function (event) {
      if (this.dragDropState) {
        this.dragDropState.dragEnter(event.path);
      }
    },

    dragLeave: function (event) {
    },

    dragOver: function (event) {
      if (this.dragDropState) {
        this.dragDropState.dragOver(event.path);
      }
    },

    drop: function (event) {
      if (this.dragDropState) {
        var target = this.dragDropState.activeDropTarget;
        if (target) {
          this.fire('drop-view', target);

          // Note: 'dragend' is not fired when the element is removed.
          this.dragEnd(event);
        }
      }
    },
  });
})();
