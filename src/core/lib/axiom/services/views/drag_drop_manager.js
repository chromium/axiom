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

/**
 * @constructor
 * Drag & drop manager for a given AXIOM-FRAME
 *
 * @param {Element} frame
 */
var DragDropManager = function(frame) {
  this.frame = frame;
  this.dragDropState = null;
  this.trackingModeActive = false;
};

export {DragDropManager};
export default DragDropManager;

DragDropManager.prototype.activate = function() {
  this.registerEventListeners();
};

/**
 * @param {string} type
 * @param {Object} detail
 */
DragDropManager.prototype.fire = function(type, detail) {
  this.frame.dispatchEvent(new CustomEvent(type, { detail: detail }));
};

DragDropManager.prototype.registerEventListeners = function() {
  var frame = this.frame;
  var document = frame.ownerDocument;

  // Event fired by axiom-view to indicate the mouse entered the title region.
  frame.addEventListener('mouseover-title', function(e) {
    this.mouseOverTitle(frame, e.detail.view);
  }.bind(this));

  // Event fired by axiom-splitter when tracking starts/ends.
  frame.addEventListener('down', function(event) {
    this.trackStart(event);
  }.bind(this));
  frame.addEventListener('up', function(event) {
    this.trackEnd(event);
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
  this.dragDropState = new DragDropState(view);
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

/**
 * @param {Event} event
 */
DragDropManager.prototype.dragLeave = function(event) {
};

/**
 * @param {Event} event
 */
DragDropManager.prototype.dragOver = function(event) {
  //console.log('dragOver', event);
  if (this.dragDropState) {
    this.dragDropState.dragOver(event.path);
    if (this.dragDropState.activeDropTarget) {
      // prevent default to allow drop
      event.preventDefault();
    }
  }
};

/**
 * @param {Event} event
 */
DragDropManager.prototype.drop = function(event) {
  //console.log('drop', event);
  if (this.dragDropState) {
    var target = this.dragDropState.activeDropTarget;
    if (target) {
      this.fire('drop-view', target);
    }
  }
};

/**
 * This event is invoked when the mouse cursor enters the area of a view
 * title. In response, we create a "draggable" overlay that will be used
 * in case a drag-drop operations is started. The title overlay is deleted
 * once the mouse cursor leaves the view title area.
 *
 * @param {Element} frame
 * @param {Element} view
 */
DragDropManager.prototype.mouseOverTitle = function(frame, view) {
  // Skip if we are already tracking mouse events. When dragging splitters,
  // for example, this prevents "accidental" creation of title overlays, as
  // well as jank during drag-drop of the splitter element.
  if (this.trackingModeActive) {
    return;
  }

  var document = frame.ownerDocument;

  // Delete all existing overlay titles, although there should be at most one.
  var titleElements = document.getElementsByTagName(AXIOM_VIEW_TITLE);
  for (var i = titleElements.length - 1; i >= 0; i--) {
    titleElements[i].removeAttribute('dragged');
    this.deleteTitleElement(titleElements[i]);
  }

  // Utility function to set the size/position of the title to match exactly
  // the size/position of the passed in rectangle.
  var setTitleRect = function(title, rect) {
    title.style.position = 'absolute';
    title.style.top = rect.top + 'px';
    title.style.left = rect.left + 'px';
    // Note: We don't want to overlay the close view ("x") icon so that the
    // underlying can still handle it.
    // TODO(rpaquay): 24 = size of "X" button.
    title.style.width = (rect.width - 24) + 'px';
    title.style.height = rect.height + 'px';
  };

  // Create the title overlay element with 'draggable' attribute.
  var title = document.createElement(AXIOM_VIEW_TITLE);
  title.id = 'frame-title-track';
  title.setAttribute('draggable', true);
  title.style.zIndex = 250;
  var titleRect = view['headerElement']().getBoundingClientRect();
  setTitleRect(title, titleRect);
  // TODO(rpaquay): hack so that drag drop manager knows what view is dragged.
  title['axiom-view'] = view;

  // Track mouse up/down events, setting/removing the 'dragged' attribute along
  // the way. This is needed to make sure the title overlay is not dismissed
  // too eagerly: When the mouse cursor is at the limit of the title overlay,
  // and the cursor is moved away from the title overlay, the 'dragstart' event
  // is slightly delayed by the browser, sometimes to the point where the mouse
  // cursor moves outside the title overlat. Given we track "mouseleave" events
  // to know when to delete the title overlay, the overlay would be deleted
  // early, preventing the browser from firing a "dragstart" event.
  var mouseDown = false;
  title.addEventListener('mousedown', function(event) {
    if (!mouseDown) {
      mouseDown = true;
      title.setAttribute('dragged', true);
    }
  });
  title.addEventListener('mouseup', function(event) {
    if (mouseDown) {
      mouseDown = false;
      title.removeAttribute('dragged');
    }
  });

  // We need to track whether we get a "mouseenter" event for the newly created
  // title overlay, so that we know what to do when we get a "mouseleave" event
  // (see below).
  var mouseEnteredTitleOverlay = false;
  var titleMouseEnterHandler = function(event) {
    //console.log('********* title mouseenter', event);
    mouseEnteredTitleOverlay = true;
    title.removeEventListener('mouseenter', titleMouseEnterHandler);
  }.bind(this);
  title.addEventListener('mouseenter', titleMouseEnterHandler);

  // Temporally track all "mouseleave" events on the document (in "useCapture"
  // mode) so that we know when the mouse cursor leaves the title overlay.
  // Note that this is somewhat tricky as we get a lot of these events,
  // including between the 'mousedown' and 'dragstart' events.
  var mouseleaveHandler = function(event) {
    //console.log('mouseleave', event);

    // "mouseleave" events *to* the title overlay are fired just after
    // we create the overlay, because, as we create it with a higher z-index,
    // the browser considers the mouse cursor is leaving the underlying view to
    // reach the title overlay element.
    // We ignore these events, as they are noise for our purposes.
    if (event.toElement === title) {
      return;
    }

    // The common case is that we get a "mouseleave" event for the title
    // overlay element. However, we may get 'mouseleave' for pretty much any
    // other element in the document if we have not received a "mouseenter"
    // for the title overlay.
    // The later case is rare and seems to happen only when the mouse
    // cursor is moving fast enough that the browser skips the 'mouseenter'
    // event for the title overlay (after it is created).
    // In either case, we delete the title overlay.
    if (!mouseEnteredTitleOverlay || event.target === title) {
      //console.log('********* title mouseleave', event);
      document.removeEventListener('mouseleave', mouseleaveHandler, true);
      if (title.parentElement) {
        this.deleteTitleElement(title);
      }
    }
  }.bind(this);
  document.addEventListener('mouseleave', mouseleaveHandler, true);

  // When the size of the view under the title overlay changes, we need to
  // adjust the title overlay to the new size.
  // Note that the size of the tracked view may change due to many reasons
  // (including "external" ones, such as the browser window is resized).
  // There is no silver bullet to track these changes using events,  so use
  // polling via requestAnmationFrame to check for any size/position change.
  // Note we do this only as long as the title overlay is active.
  var watchSize = function(timestamp) {
    // If the title element is not part of the DOM anymore, stop tracking.
    // TODO(rpaquay): Should we also stop if the "dragged" attrinute is set?
    if (!title.parentElement) {
      //console.log('cancelling polling of title overlay resize', title);
      return;
    }

    // Track only if the view is still in the DOM.
    if (view.parentElement) {
      // Any change in bounding client rect requires a resize of the title.
      var newTitleRect = view['headerElement']().getBoundingClientRect();
      if (newTitleRect.top !== titleRect.top ||
          newTitleRect.left !== titleRect.left ||
          newTitleRect.width !== titleRect.width ||
          newTitleRect.height !== titleRect.height) {
        //console.log('resizing title overlay', newTitleRect);
        setTitleRect(title, newTitleRect);
        titleRect = newTitleRect;
      }
    }
    document.defaultView.requestAnimationFrame(watchSize);
  };
  document.defaultView.requestAnimationFrame(watchSize);

  // And finally add the newly created title overlay element to the dom.
  document.body.appendChild(title);
};

/**
 * @param {Event} event
 */
DragDropManager.prototype.trackStart = function(event) {
  //console.log('trackStart', this);
  this.trackingModeActive = true;
};

/**
 * @param {Event} event
 */
DragDropManager.prototype.trackEnd = function(event) {
  //console.log('trackEnd', this);
  this.trackingModeActive = false;
};

/**
 * @param {Element} title
 */
DragDropManager.prototype.deleteTitleElement = function(title) {
  //console.log('delete title element', title);
  // Do not delete title bar if it is in drap-drop mode, because that would
  // interfere with the browser sending a "dragend" event.
  if (!title.hasAttribute('dragged')) {
    if (title.parentElement) {
      title.parentElement.removeChild(title);
    }
  }
};
