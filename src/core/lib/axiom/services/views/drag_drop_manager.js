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

var AXIOM_VIEW_TITLE = 'AXIOM-VIEW-TITLE';

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
  var frame = this.frame;
  var document = frame.ownerDocument;

  // Event fired by axiom-view to indicate the mouse entered the title region.
  frame.addEventListener('title-enter', function(e) {
    this.enterViewTitle(frame, e.detail.view);
  }.bind(this));

  // Event fired by axiom-view to indicate the mouse left the title region.
  frame.addEventListener('title-leave', function(e) {
    this.leaveViewTitle(frame, e.detail.view);
  }.bind(this));

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
    this.dragOver(event);
  }.bind(this), false);

  document.addEventListener('dragenter', function (event) {
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
  //console.log('dragstart', event);
  if (event.target.tagName !== AXIOM_VIEW_TITLE)
    return;

  // Mark element as being dragged so that view manager does not delete
  // it too eagerly during drap-drop operation.
  event.target.setAttribute('dragged', '');

  var view = event.target['axiom-view'];

  // Use state to keep track of current drag-drop operation.
  this.dragDropState = new DragDropState(this, view);
  this.dragDropState.dragStart(event.path);

  // Fire custom 'drag-start' event
  this.fire('drag-start', { view: view });
};

DragDropManager.prototype.dragEnd = function (event) {
  //console.log('dragend', event);
  if (event.target.tagName !== AXIOM_VIEW_TITLE)
    return;
  var title = event.target;
  var view = title['axiom-view'];

  // Done with this operation.
  if (this.dragDropState) {
    this.dragDropState.dragEnd();
    this.dragDropState = null;
  }

  // Fire custom 'drag-end' event
  this.fire('drag-end', { view: view });

  // Remove title bar element from document after all is set and done.
  title.removeAttribute('dragged');
  this.deleteTitleElement(title);
};

DragDropManager.prototype.drag = function (event) {
  //console.log('drag', event);
  if (event.target.tagName !== AXIOM_VIEW_TITLE)
    return;
  var title = event.target;
  // Note: Hiding the element should ideally be done in the "dragStart"
  // function, but doing so cancels the drag-drop operation, so we delay
  // hiding the element until the "drag" event is called.
  if (!title.hasAttribute('hidden')) {
    title.setAttribute('hidden', '');
  }
};

DragDropManager.prototype.dragEnter = function (event) {
  if (this.dragDropState) {
    this.dragDropState.dragEnter(event.path);
    if (this.dragDropState.activeDropTarget) {
      // prevent default to allow drop
      event.preventDefault();
    }
  }
};

DragDropManager.prototype.dragLeave = function (event) {
};

DragDropManager.prototype.dragOver = function (event) {
  //console.log('dragOver', event);
  if (this.dragDropState) {
    this.dragDropState.dragOver(event.path);
    if (this.dragDropState.activeDropTarget) {
      // prevent default to allow drop
      event.preventDefault();
    }
  }
};

DragDropManager.prototype.drop = function (event) {
  //console.log('drop', event);
  if (this.dragDropState) {
    var target = this.dragDropState.activeDropTarget;
    if (target) {
      this.fire('drop-view', target);
    }
  }
};

DragDropManager.prototype.enterViewTitle = function(frame, view) {
  var document = frame.ownerDocument;

  var titleElements = document.getElementsByTagName(AXIOM_VIEW_TITLE);
  for (var i = titleElements.length - 1; i >= 0; i--) {
    this.deleteTitleElement(titleElements[i]);
  }

  var title = document.createElement(AXIOM_VIEW_TITLE);
  var r = view.headerElement().getBoundingClientRect();
  title.id = 'frame-title-track';
  title.setAttribute('draggable', true);
  title.style.position = 'absolute';
  title.style.top = r.top + 'px';
  title.style.left = r.left + 'px';
  // TODO(rpaquay): 24 = size of "X" button.
  title.style.width = (r.width - 24) + 'px';
  title.style.height = r.height + 'px';
  title.style.zIndex = 250;
  // TODO(rpaquay): hack so that drag drop manager knows what view is dragged.
  title['axiom-view'] = view;

  title.addEventListener('mouseleave', function(event) {
    this.deleteTitleElement(title);
  }.bind(this));

  document.body.appendChild(title);
};

DragDropManager.prototype.leaveViewTitle = function(frame, view) {
};

DragDropManager.prototype.deleteTitleElement = function(title) {
  // Do not delete title bar if it is in drap-drop mode, because that would
  // interfere with the browser sending a "dragend" event.
  if (!title.hasAttribute('dragged')) {
    title.parentElement.removeChild(title);
  }
};
