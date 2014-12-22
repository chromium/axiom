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

import AxiomError from 'axiom/core/error';
import Check from 'axiom/util/check';
import DragDropState from 'axiom/services/views/drag_drop_state';

/*
 * Drag & drop manager for a given AXIOM-FRAME
 */
export var DragDropManager = function(frame) {
  this.frame = frame;
  this.dragDropState = null;
};

export default DragDropManager;

DragDropManager.prototype.activate = function() {
  this.registerEventListeners();
};

DragDropManager.prototype.fire = function(type, detail) {
  this.frame.dispatchEvent(new CustomEvent(type, { detail: detail }));
};

DragDropManager.prototype.registerEventListeners = function() {
  var document = this.frame.ownerDocument;

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
};

DragDropManager.prototype.dragStart = function (event) {
  if (event.target.tagName !== 'AXIOM-VIEW')
    return;
  var view = event.target;

  // Use state to keep track of current drag-drop operation.
  this.dragDropState = new DragDropState(this, view);
  this.dragDropState.dragStart(event.path);

  // make the view half transparent
  view.style.opacity = 0.5;

  // This causes the drag-drop operation to be canceled.
  //this['view-manager'].detachView(event.target, window.document.body);

  // Fire custom 'drag-start' event
  this.fire('drag-start', { view: view });
};

DragDropManager.prototype.dragEnd = function (event) {
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
};

DragDropManager.prototype.drag = function (event) {
};

DragDropManager.prototype.dragEnter = function (event) {
  if (this.dragDropState) {
    this.dragDropState.dragEnter(event.path);
  }
};

DragDropManager.prototype.dragLeave = function (event) {
};

DragDropManager.prototype.dragOver = function (event) {
  if (this.dragDropState) {
    this.dragDropState.dragOver(event.path);
  }
};

DragDropManager.prototype.drop = function (event) {
  if (this.dragDropState) {
    var target = this.dragDropState.activeDropTarget;
    if (target) {
      this.fire('drop-view', target);

      // Note: 'dragend' is not fired when the element is removed.
      this.dragEnd(event);
    }
  }
};
