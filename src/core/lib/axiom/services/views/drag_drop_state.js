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

/**
 * @constructor
 * Helper class used to track the state of an active drag & drop operation.
 *
 * @param {HTMLElement} view
 */
var DragDropState = function(view) {
  this.view = view;

  /**
   * Array of element with activate drop zones.
   * @type {Array<HTMLElement>}
   */
  this.currentDropZones = [];

  // There is no active drop target yet.
  this.activeDropTarget = null;
};

export {DragDropState};
export default DragDropState;

DragDropState.prototype.dragStart = function(path) {
  this.activateDropZones(path);
  this.activateDropTarget(path);
};

DragDropState.prototype.dragEnd = function() {
  // Hide active drop zones.
  for(var i = 0; i < this.currentDropZones.length; i++) {
    this.currentDropZones[i]['dropZones']().setAttribute('hidden', '');
  }
  this.currentDropZones = [];
  this.deactivateDropTarget();
};

DragDropState.prototype.dragEnter = function(path) {
  this.activateDropZones(path);
  this.activateDropTarget(path);
};

DragDropState.prototype.dragLeave = function(path) {
};

DragDropState.prototype.dragOver = function(path) {
};

// Return the first element of [path] with [tagName], or null if not found.
DragDropState.prototype.getElementInPath = function(path, tagName) {
  for (var i = 0; i < path.length; i++) {
    if (path[i].tagName === tagName) {
      return path[i];
    }
  }
  return null;
};

// Return the first 'axiom-drop-zone' element of [path], or null if not found.
DragDropState.prototype.getDropZone = function(path) {
  return this.getElementInPath(path, 'AXIOM-DROP-ZONE');
};

// Return an array of elements with drop zones from [path].
DragDropState.prototype.getDropZones = function(path) {
  var result = [];
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
};

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
    currentPath[i]['dropZones']().setAttribute('hidden', '');
  }

  // Show the newly active drop zones
  for(i = lastCommonParent + 1; i < newPath.length; i++) {
    newPath[i]['dropZones']().removeAttribute('hidden');
  }

  // Update state for next call.
  this.currentDropZones = newPath;
};

DragDropState.prototype.activateDropTarget = function(path) {
  var dropZone = this.getDropZone(path);
  if (!dropZone) {
    this.deactivateDropTarget();
    return;
  }

  //TODO(rginda): Closure noticed that there's no such property as
  //this.currentDropZone, but I'm not sure what the intention is here.
  //if (dropZone === this.currentDropZone) {
  //  return;
  //}

  this.deactivateDropTarget();

  // Activate a new drop target
  var position = dropZone.position;
  var dropZones = this.getDropZones(path);
  var container = dropZones[dropZones.length - 1];
  var anchor = container['anchorsElement']().anchor(position);
  anchor.removeAttribute('hidden');
  // Note: We need a value (not just empty string) for the attribute,
  // otherwise polymer won't detect changes to the attribute value.
  /** HTMLElement */ var elem = container['dropZones']()['zone'](position);
  elem.setAttribute('active', '1');

  this.activeDropTarget = {
    view: this.view,
    target: container,
    targetPosition: position
  };
};

DragDropState.prototype.deactivateDropTarget = function() {
  if (!this.activeDropTarget)
    return;

  var position = this.activeDropTarget.targetPosition;
  var container = this.activeDropTarget.target;
  var anchor = container['anchorsElement']().anchor(position);
  anchor.setAttribute('hidden', '');
  /** HTMLElement */ var elem = container['dropZones']()['zone'](position);
  elem.removeAttribute('active');

  this.activeDropTarget = null;
};
