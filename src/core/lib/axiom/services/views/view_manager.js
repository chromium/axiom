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
import DragDropManager from 'axiom/services/views/drag_drop_manager';


// Invariants of the ViewManager, Containers and Views:
// * The top level element is an 'axiom-frame' with no particular layout. It
//   serves as the 'root' of what the view manager is aware of.
// * The frame contains one element at most: either a view or a container.
// * The frame element must have the 'fit' attribute
// * If the frame element is a container, the layout can be vertical or
//   horizontal.
// * Containers are elements used for grouping 2 or more sub-elements in a
//   given direction (vertical or horizontal). A container contains a sequence
//   of Containers (in the opposite layout direction only) and Views, all
//   separated by Splitters.
// * All sub-elements are fixed size (width or height, dependending on the
//   layout direction), except for one which is 'flex'.
// * A View is the frame around any custom view content. A view is always
//   inside either a Container or the top level frame (special case of a
//   frame with a single view).
var AXIOM_CONTAINER = 'AXIOM-CONTAINER';
var AXIOM_FRAME = 'AXIOM-FRAME';
var AXIOM_SPLITTER = 'AXIOM-SPLITTER';
var AXIOM_VIEW = 'AXIOM-VIEW';

/**
 * Check the given 'axiom-view' element is valid.
 * @param {Element} view
 */
var checkValidView = function(view) {
  Check.eq(view.tagName, AXIOM_VIEW);
  /*
  var parent = view.parentElement;
  Check.in(parent.tagName, [AXIOM_CONTAINER, AXIOM_FRAME]);
  if (parent.tagNane === AXIOM_CONTAINER) {
    Check.ge(parent.children.length, 2,
      'Container must have more than one view');
  }
  */
};

/**
 * Check the given 'axiom-container' element is valid.
 * @param {Element} container
 */
var checkValidContainer = function(container) {
  Check.eq(container.tagName, AXIOM_CONTAINER);
  Check.in(container.parentElement.tagName, [AXIOM_FRAME, AXIOM_CONTAINER]);
  Check.true(container.hasAttribute('layout'));

  if (container.parentElement.tagName === AXIOM_CONTAINER) {
    var direction = (container.parentElement.hasAttribute(
      'vertical') ? 'horizontal' : 'vertical');
    Check.true(container.hasAttribute(direction));
  } else {
    Check.true(container.hasAttribute('horizontal') ||
      container.hasAttribute('vertical'));
    Check.true(container.hasAttribute('fit'));
  }

  for (var i = 0; i < container.children.length; i++) {
    var child = container.children[i];
    if ((i % 2) === 0) {
      Check.in(child.tagName, [AXIOM_CONTAINER, AXIOM_VIEW]);
      if (child.tagName === AXIOM_CONTAINER) {
        checkValidContainer(child);
      } else {
        checkValidView(child);
      }
    } else {
      Check.eq(child.tagName, AXIOM_SPLITTER);
    }
  }
};

/**
 * Check the given 'axiom-frame' element is valid.
 * @param {Element} frame
 */
var checkValidFrame = function(frame) {
  Check.eq(frame.tagName, AXIOM_FRAME);
  Check.le(frame.children.length, 1);

  var child = frame.firstElementChild;
  if (child !== null) {
    Check.in(child.tagName, [AXIOM_CONTAINER, AXIOM_VIEW]);
    if (child.tagName === AXIOM_CONTAINER) {
      checkValidContainer(child);
    } else {
      checkValidView(child);
    }
  }
};

/**
 * Calls a function on each view contained in a frame.
 * @param {Element} frame
 * @param {function(HTMLElement)} callback
 */
var forEachFrameViews = function(frame, callback) {
  Check.eq(frame.tagName, AXIOM_FRAME);

  var views = frame.querySelectorAll(AXIOM_VIEW);
  for (var i = 0; i < views.length; i++) {
    callback(views[i]);
  }
};

/**
 * Polymer splitter elements don't re-ajust themselves automically
 * with changes to the DOM. The purpose of this function is to
 * force all splitter elements to refresh themselves.
 *
 * @param {HTMLElement} container
 */
var fixupSplitters = function(container) {
  Check.eq(container.tagName, AXIOM_CONTAINER);

  var splitters = container.querySelectorAll(AXIOM_SPLITTER);
  for (var i = 0; i < splitters.length; i++) {
    splitters[i].directionChanged();
  }
};

/**
 * @constructor
 * Simple encapsulation around 'axiom-view' elements.
 * @param {Element} rawView
 */
var ViewWrapper = function(rawView) {
  checkValidView(rawView);
  this.rawView_ = rawView;
  this.rawContainer_ = rawView.parentElement;
};

ViewWrapper.prototype.isInsideFrame = function() {
  return this.rawContainer_.tagName === AXIOM_FRAME;
};

ViewWrapper.prototype.detachFromParent = function() {
    this.rawContainer_.removeChild(this.rawView_);
};

ViewWrapper.prototype.hasSingleSibling = function() {
  var siblingCount = 0;
  for (var child = this.rawContainer_.firstElementChild; child !== null;
       child = child.nextElementSibling) {
    if (child.tagName === AXIOM_VIEW || child.tagName === AXIOM_CONTAINER) {
      if (child !== this.rawView_) {
        siblingCount++;
      }
    }
  }
  return siblingCount === 1;
};

ViewWrapper.prototype.getOtherSiblingElement = function() {
  var siblingCount = 0;
  for (var child = this.rawContainer_.firstElementChild; child !== null;
       child = child.nextElementSibling) {
    if (child.tagName === AXIOM_VIEW || child.tagName === AXIOM_CONTAINER) {
      if (child !== this.rawView_) {
        return child;
      }
    }
  }
  Check.fail('Element should have at least one sibling.');
};

ViewWrapper.prototype.getContainerElement = function() {
  return this.rawContainer_;
};

ViewWrapper.prototype.isFirstChild = function() {
  return this.rawView_.previousElementSibling === null;
};

/**
 * @constructor
 * Registry of views that can be placed in windows.
 */
var ViewManager = function(moduleManager) {
  this.moduleManager_ = moduleManager;
  this.views_ = new Map();
  this.extensionBindings_ = new Set();
};

export {ViewManager};
export default ViewManager;

/**
 * @param {ServiceBinding} serviceBinding
 */
ViewManager.prototype.bind = function(serviceBinding) {
  serviceBinding.bind(this, {
    'onExtend': 'onExtend',
    'register': 'register',
    'unregister': 'unregister',
    'show': 'show',
    'hide': 'hide',
  });

  serviceBinding.ready();
};

/**
 * Extending the View Manager adds new view types.
 *
 * The extension descriptor should provide a unique id for each view.  The
 * binding should provide 'show' and 'hide' callbacks.
 *
 * @param {ExtensionBinding} extensionBinding
 */
ViewManager.prototype.onExtend = function(extensionBinding) {
  this.extensionBindings_.add(extensionBinding);
  var defineViews = extensionBinding.descriptor['define-views'];
  for (var id in defineViews) {
    this.views_.set(id, {
      descriptor: defineViews[id],
      extensionBinding: extensionBinding
    });
  }
};

/**
 * Registers a view given a unique id and a custom element.
 *
 * @param {string} viewId  The view id
 * @param {string} tagName  The custom element to create
 */
ViewManager.prototype.register = function(viewId, tagName) {
  if (this.views_.has(viewId))
    return Promise.reject(AxiomError.Duplicate('view', viewId));

  this.views_.set(viewId, {
    tagName: tagName,
  });
};

/**
 * Unregisters a view given its id.
 *
 * @param {string} viewId  The view id
 */
ViewManager.prototype.unregister = function(viewId) {
  if (!this.views_.has(viewId))
    return Promise.reject(AxiomError.NotFound('view', viewId));

  this.views_.delete(viewId);
};

/**
 * Display a view given it id and location information.
 *
 * @param {string} viewId  The view id
 * @param {Object} args
 */
ViewManager.prototype.show = function(viewId, args) {
  var view = this.views_.get(viewId);
  if (!view)
    return Promise.reject(AxiomError.NotFound('view', viewId));

  var windowsService = this.moduleManager_.getServiceBinding('windows@axiom');
  return windowsService.whenLoadedAndReady().then(function() {
    // TODO(rpaquay): 'main-window' should not be hard coded.
    return windowsService.openWindow('main-window').then(function(window) {
      // TODO(rpaquay): Add support for adding more than a single view.
      return this.createRootFrame(window.document);
    }.bind(this)).then(function(frame) {
      var viewElement = this.createViewElement(
        frame.ownerDocument, view.tagName);
      if (!frame.childNodes.length) {
        frame.appendChild(viewElement);
      } else {
        this.insertView(viewElement, frame, 'right');
      }

      view.element = viewElement;
      return Promise.resolve(viewElement.lastChild);
      // TODO(rpaquay): Call 'onShow' on extension binding
      //view.element.onShow();
    }.bind(this));
  }.bind(this));
};

/**
 * Hides a view.
 *
 * @param {string} viewId  The view id
 */
ViewManager.prototype.hide = function(viewId) {
  var view = this.views_.get(viewId);
  if (!view)
    return Promise.reject(AxiomError.NotFound('view', viewId));
};

/**
 * @param {Element} view
 */
ViewManager.prototype.closeView = function(view) {
  if (view.parentElement) {
    this.detachView(view);
  }
  if (view.firstElementChild && view.firstElementChild.viewClosed) {
    view.firstElementChild.viewClosed();
  }
  // TODO(rpaquay): Remove from views_?
};

ViewManager.prototype.trackStart = function(frame) {
  forEachFrameViews(frame, function(view) {
    view.enterDragMode();
  });
  frame.enterDragMode();
};

ViewManager.prototype.trackEnd = function(frame) {
  frame.leaveDragMode();
  forEachFrameViews(frame, function(view) {
    view.leaveDragMode();
  });
};

ViewManager.prototype.dragStart = function(frame, view) {
  view.setAttribute('dragdrop', '1');
  this.detachView(view);
  this.trackStart(frame);
};

ViewManager.prototype.dragEnd = function(frame, view) {
  this.trackEnd(frame);
  if (view.hasAttribute('dragdrop')) {
    this.closeView(view);
  }
};

ViewManager.prototype.drop = function(frame, detail) {
  this.insertView(detail.view, detail.target, detail.targetPosition);
  detail.view.removeAttribute('dragdrop');
};

/**
 * @param {Document} document
 * @return {Promise}  A promise resolvinf to the 'axiom-frame' element.
 */
ViewManager.prototype.createRootFrame = function(document) {
  var createFrame = function() {
    var frame = document.createElement(AXIOM_FRAME);
    document.body.appendChild(frame);
    frame.setAttribute('fit', '');

    // Event fired by DragDropManager when a drag operation is starting.
    frame.addEventListener('drag-start', function(e) {
      this.dragStart(frame, e.detail.view);
    }.bind(this));

    // Event fired by DragDropManager when a drag operation has ended.
    frame.addEventListener('drag-end', function(e) {
      this.dragEnd(frame, e.detail.view);
    }.bind(this));

    // Event fired by DragDropManager when a view is moved to a new location.
    frame.addEventListener('drop-view', function(e) {
      this.drop(frame, e.detail);
    }.bind(this));

    var dragDropManager = new DragDropManager(frame);
    dragDropManager.activate();

    return frame;
  }.bind(this);

  if (document.readyState === 'complete') {
    var frame = document.querySelector(AXIOM_FRAME) || createFrame();
    return Promise.resolve(frame);
  }

  return new Promise(function(resolve, reject) {
    var onReadyStateChange = function() {
      if (document.readyState === 'complete') {
        document.removeEventListener('readystatechange', onReadyStateChange);
        resolve(createFrame());
      }
    };
    document.addEventListener('readystatechange', onReadyStateChange);
  });
};

/**
 * @param {Document} document
 * @param {string} tagName
 * @return {Element}  The 'axiom-view' element.
 */
ViewManager.prototype.createViewElement = function(document, tagName) {
  var viewElement = document.createElement(AXIOM_VIEW);
  viewElement.setAttribute('fit', '');
  viewElement.addEventListener('close', function() {
    this.closeView(viewElement);
  }.bind(this));
  var element = document.createElement(tagName);
  element.style.position = 'absolute';
  element.style.height = '100%';
  element.style.width = '100%';
  viewElement.appendChild(element);
  return viewElement;
};

/**
 * @param {Document} document
 * @return {Element} The 'axiom-splitter' element.
 */
ViewManager.prototype.createSplitter = function(document) {
  var frame = document.querySelector(AXIOM_FRAME);
  var splitter = document.createElement(AXIOM_SPLITTER);
  splitter.addEventListener('down', function(e) {
    this.trackStart(frame);
  }.bind(this));
  splitter.addEventListener('up', function(e) {
    this.trackEnd(frame);
  }.bind(this));
  return splitter;
};

/**
 * @param {Element} view  Update the view element attributes so that it fits
 * the whole parent frame.
 */
ViewManager.prototype.makeSingleViewFrame = function(view) {
  view.setAttribute('fit', '');
  view.style.removeProperty('width');
  view.style.removeProperty('height');
  return view;
};

/**
 * Return the parent 'axiom-frame' element of a given child element.
 * @param {Element} element
 */
ViewManager.prototype.getParentFrame = function(element) {
  while (element) {
    if (element.tagName === AXIOM_FRAME)
      return element;
    element = element.parentElement;
  }
  return null;
};

ViewManager.prototype.insertView = function(view, target, position) {
  checkValidView(view);
  Check.ne(view, target);
  Check.in(position, ['left', 'right', 'top', 'bottom']);

  // Insertion into the main frame is a special case, as the main frame
  // is neither horizontal or vertical.
  if (target.tagName === AXIOM_FRAME) {
    this.moveViewIntoFrame(view, target, position);
  } else if (target.tagName === AXIOM_CONTAINER) {
    this.moveViewIntoContainer(view, target, position);
  } else if (target.tagName === AXIOM_VIEW) {
    this.moveViewNextToView(view, target, position);
  }
};

/**
 * Moves a view from it current container to a new location relative to a
 * target element.
 *
 * @param {Element} view  The 'axiom-view' element to move.
 * @param {Element} target  The element (view, container or frame) @view moves
 * relative to.
 * @param {string} position  'left', 'right', 'top', 'bottom': where to move
 * the view relative to 'target'.
 */
ViewManager.prototype.moveView = function(view, target, position) {
  checkValidView(view);
  Check.ne(view, target);
  Check.in(position, ['left', 'right', 'top', 'bottom']);

  var frame = this.getParentFrame(target);
  if (!frame)
    return;

  // If the parent of the view is a container, the container may disappear
  // during the call to "detach" below. Pick a backup target that we know
  // won't disappear to use later at the new target.
  var backupTarget = null;
  if (view.parentElement.tagName === AXIOM_CONTAINER) {
    for (var elem = view.parentElement.firstElementChild;
         elem !== null;
         elem = elem.nextElementSibling) {
      if (elem !== view) {
        if (elem.tagName === AXIOM_CONTAINER || elem.tagName === AXIOM_VIEW) {
          backupTarget = elem;
        }
      }
    }
  }

  // Remove the view and re-grunt. Note this may remove the container from
  // the frame.
  this.detachView(view);

  // See comment above...
  if (target.parentElement === null) {
    if (backupTarget.parentElement !== null)
      target = backupTarget;
    else
      target = frame; // last resort.
  }

  // Insert view into new location.
  this.insertView(view, target, position);
};

/**
 * @param {Element} view  The 'axiom-view' element to move.
 * @param {Element} targetContainer  The container the view moves into.
 * @param {string} position  The position in the container ('left', 'right',
 * 'top', 'bottom').
 */
ViewManager.prototype.moveViewIntoContainer =
    function(view, targetContainer, position) {
  Check.eq(targetContainer.tagName, AXIOM_CONTAINER);
  var parent = targetContainer.parentElement;
  Check.true(!!parent, 'Container has been deleted (no parent)');
  Check.in(parent.tagName, [AXIOM_FRAME, AXIOM_CONTAINER]);

  var layout =
    targetContainer.hasAttribute('vertical') ? 'vertical' : 'horizontal';
  var containerIsCompatible =
    (layout === 'vertical' && (position == 'top' || position === 'bottom')) ||
    (layout === 'horizontal' && (position == 'left' || position === 'right'));
  // If inserting inside a compatible container, we only need to insert
  // the child and re-grout
  if (containerIsCompatible) {
    if (position === 'left' || position === 'top') {
      targetContainer.insertBefore(view, targetContainer.firstElementChild);
    } else {
      targetContainer.appendChild(view);
    }
    this.groutContainer(targetContainer);
  } else {
    // Inserting inside an 'incompatible' container: we need
    // a new container in the other direction, and insert the view
    // there.
    var newContainer = document.createElement(AXIOM_CONTAINER);
    if (parent.tagName === AXIOM_FRAME)
      newContainer.setAttribute('fit', '');
    newContainer.setAttribute('layout', '');
    newContainer.setAttribute(
      layout === 'vertical' ? 'horizontal' : 'vertical', '');
    parent.replaceChild(newContainer, targetContainer);
    if (position === 'left' || position === 'top') {
      newContainer.appendChild(view);
      newContainer.appendChild(targetContainer);
    } else {
      newContainer.appendChild(targetContainer);
      newContainer.appendChild(view);
    }
    this.groutContainer(newContainer);
    if (parent.tagName === AXIOM_CONTAINER)
      this.groutContainer(parent);
    return view;
  }
};

/**
 * @param {Element} view
 * @param {Element} targetView
 * @param {string} position
 */
ViewManager.prototype.moveViewNextToView =
    function(view, targetView, position) {
  var targetWrapper = new ViewWrapper(targetView);
  if (targetWrapper.isInsideFrame()) {
    return this.moveViewIntoFrame(
      view, targetWrapper.getContainerElement(), position);
  }

  // The view is inside a container
  var targetContainer = targetWrapper.getContainerElement();

  Check.eq(targetContainer.tagName, AXIOM_CONTAINER);
  var layout =
      targetContainer.hasAttribute('vertical') ? 'vertical' : 'horizontal';
  var containerIsCompatible =
    (layout === 'vertical' && (position == 'top' || position === 'bottom')) ||
    (layout === 'horizontal' && (position == 'left' || position === 'right'));
  // If inserting inside a compatible container, we only need to insert
  // the child and re-grout
  if (containerIsCompatible) {
    if (position === 'left' || position === 'top') {
      targetContainer.insertBefore(view, targetView);
    } else {
      targetContainer.insertBefore(view, targetView.nextElementSibling);
    }
    this.groutContainer(targetContainer);
  } else {
    // Inserting inside an 'incompatible' container: we need
    // a new container in the other direction, and insert the view
    // there.
    var newContainer = document.createElement(AXIOM_CONTAINER);
    newContainer.setAttribute('layout', '');
    newContainer.setAttribute(
      layout === 'vertical' ? 'horizontal' : 'vertical', '');
    targetContainer.replaceChild(newContainer, targetView);
    if (position === 'left' || position === 'top') {
      newContainer.appendChild(view);
      newContainer.appendChild(targetView);
    } else {
      newContainer.appendChild(targetView);
      newContainer.appendChild(view);
    }
    this.groutContainer(targetContainer);
    this.groutContainer(newContainer);
    return view;
  }
};

/**
 * @param {Element} view
 * @param {Element} frame
 * @param {string} position
 */
ViewManager.prototype.moveViewIntoFrame = function(view, frame, position) {
  var newContainer;

  // The frame is empty, makes the view fit its entire area.
  if (frame.children.length === 0) {
    this.makeSingleViewFrame(view);
    frame.appendChild(view);
    return view;
  } else {
    Check.eq(frame.children.length, 1);
    var child = frame.children[0];
    if (child.tagName == AXIOM_VIEW) {
      newContainer = document.createElement(AXIOM_CONTAINER);
      newContainer.setAttribute('fit', '');
      newContainer.setAttribute('layout', '');
      newContainer.setAttribute(
        position === 'left' || position === 'right' ? 'horizontal' : 'vertical',
        '');
      if (position === 'left' || position === 'top') {
        newContainer.appendChild(view);
        newContainer.appendChild(child);
      } else {
        newContainer.appendChild(child);
        newContainer.appendChild(view);
      }
      frame.appendChild(newContainer);
      this.groutContainer(newContainer);
      return view;
    } else {
      Check.eq(child.tagName, AXIOM_CONTAINER);
      var layout = child.hasAttribute('vertical') ? 'vertical' : 'horizontal';
      var containerIsCompatible =
        (layout === 'vertical' &&
          (position == 'top' || position === 'bottom')) ||
        (layout === 'horizontal' &&
          (position == 'left' || position === 'right'));
      // If inserting inside a compatible container, we only need to insert
      // the child and re-grout
      if (containerIsCompatible) {
        if (position === 'left' || position === 'top') {
          child.insertBefore(view, child.firstChild);
        } else {
          child.appendChild(view);
        }
        this.groutContainer(child);
      } else {
        // Inserting inside an 'incompatible' container: we need
        // a new container in the other direction, and insert the view
        // there.
        newContainer = document.createElement(AXIOM_CONTAINER);
        newContainer.setAttribute('fit', '');
        newContainer.setAttribute('layout', '');
        newContainer.setAttribute(
          layout === 'vertical' ? 'horizontal' : 'vertical', '');
        if (position === 'left' || position === 'top') {
          newContainer.appendChild(view);
          newContainer.appendChild(child);
        } else {
          newContainer.appendChild(child);
          newContainer.appendChild(view);
        }
        frame.appendChild(newContainer);
        this.groutContainer(newContainer);
        return view;
      }
    }
  }
};

/**
 * @param {Element} rawView
 */
ViewManager.prototype.detachView = function(rawView) {
  var view = new ViewWrapper(rawView);
  // Special case of single (and last) view inside main frame.
  if (view.isInsideFrame()) {
    view.detachFromParent();
    return view;
  }

  // Special case: the view has only one sibling. We need to move the sibling
  // to the parent container.
  if (view.hasSingleSibling()) {
    var sibling = view.getOtherSiblingElement();
    var container = view.getContainerElement();
    Check.eq(container.tagName, AXIOM_CONTAINER);
    var containerWidth = container.style.getPropertyValue('width');
    var containerHeight = container.style.getPropertyValue('height');
    var parent = container.parentElement;
    view.detachFromParent();

    // This takes care of removing the splitter and other sibling view
    parent.replaceChild(sibling, container);
    if (parent.tagName === AXIOM_FRAME) {
      this.makeSingleViewFrame(sibling);
      return view;
    } else {
      // Recompute layout of the container, after removing 'flex' from this
      // view as the container must have a flex view already.
      // Transfer the old container width/height to the new sibling element,
      // to avoid having the corresponding area change size when the ownership
      // transfers.
      sibling.removeAttribute('flex');
      if (parent.hasAttribute('horizontal')) {
        sibling.style.width = containerWidth;
      } else {
        sibling.style.height = containerHeight;
      }
      this.groutContainer(parent);
      return view;
    }
  }

  // General case: removing a view from a collection of siblings (2 or more)
  var containerElement = view.getContainerElement();
  view.detachFromParent();
  this.groutContainer(containerElement);
  return view;
};

/**
 * Ensure the set of element inside [container] are layed out according to
 * the invariants of a Container constraints.
 *
 * @param {Element} container
 */
ViewManager.prototype.groutContainer = function(container) {
  Check.eq(container.tagName, AXIOM_CONTAINER);

  var layout = (container.hasAttribute('vertical') ? 'vertical' : 'horizontal');
  var i, child, nextChild;

  // If we have any child container with the same layout as ours,
  // transfer its children to our list of children.
  for (child = container.firstElementChild; child != null;) {
    nextChild = child.nextElementSibling;
    if (child.tagName === AXIOM_CONTAINER) {
      if (child.hasAttribute(layout)) {
        for (var childChild = child.firstElementChild; childChild != null;) {
          var nextChildChild = childChild.nextElementSibling;
          container.insertBefore(childChild, child);
          childChild = nextChildChild;
        }
        container.removeChild(child);
      }
    }
    child = nextChild;
  }

  // Ensure we have exactly one splitter between each container/view
  var index = 0;
  for (child = container.firstElementChild; child != null;) {
    nextChild = child.nextElementSibling;
    if ((index % 2) === 0) {
      if (child.tagName === AXIOM_SPLITTER) {
        container.removeChild(child);
      } else {
        index++;
      }
      child = nextChild;
    } else {
      if (child.tagName === AXIOM_SPLITTER && nextChild == null) {
        container.removeChild(child);
        child = nextChild;
      } else {
        if (child.tagName !== AXIOM_SPLITTER) {
          var splitter = this.createSplitter(document);
          container.insertBefore(splitter, child);
        } else {
          child = nextChild;
        }
        index++;
      }
    }
  }

  // At this point, the container should have children that are either view,
  // container or splitter.
  for (i = 0; i < container.children.length; i++) {
    child = container.children[i];
    if ((i % 2) === 0) {
      Check.in(child.tagName, [AXIOM_VIEW, AXIOM_CONTAINER]);
    } else {
      Check.eq(child.tagName, AXIOM_SPLITTER);
    }
  }

  // Ensure there is exactly one element with the 'flex' attribute
  var flexChildIndex = -1;
  for (i = 0; i < container.children.length; i++) {
    child = container.children[i];
    if (child.hasAttribute('flex')) {
      if (flexChildIndex === -1) {
        flexChildIndex = i;
      } else {
        child.removeAttribute('flex');
      }
    }
  }

  // If the container has no 'flex' element, pick the first child
  // as the de factor 'flex'.
  // TODO(rpaquay): This behavior seems questionable. Figure out a
  // better way to address this corner case.
  if (flexChildIndex === -1) {
    container.children[0].setAttribute('flex', '');
    flexChildIndex = 0;
  }

  // Ensure all splitters point 'away' from the 'flex' child, e.g
  // 'left' | 'left' | 'flex' | 'right' | 'right' or
  // 'up' | 'up' | 'flex' | 'down' | 'down'.
  for (i = 0; i < container.children.length; i++) {
    child = container.children[i];
    if (child.tagName === AXIOM_SPLITTER) {
      Check.in(layout, ['vertical', 'horizontal']);
      var direction;
      if (layout === 'horizontal') {
        direction = (i < flexChildIndex ? 'left' : 'right');
      } else {
        direction = (i < flexChildIndex ? 'up' : 'down');
      }
      child.setAttribute('direction', direction);
    }
  }

  function removeExplicitSize(element, parentLayout) {
    if (element.hasAttribute('flex')) {
      element.style.removeProperty('width');
      element.style.removeProperty('height');
      return;
    }

    // Set default size if there is none
    // TODO(rpaquay): This behavior seems questionable. Figure out a
    // better way to address this corner case.
    if (element.tagName !== AXIOM_SPLITTER) {
      if (parentLayout === 'vertical') {
        element.style.removeProperty('width');
        if (!element.style.height) {
          element.style.height = '200px';
        }
      } else {
        element.style.removeProperty('height');
        if (!element.style.width) {
          element.style.width = '200px';
        }
      }
    }
  }

  // Update layout attribute of all non splitter elements
  for (child = container.firstElementChild; child !== null;
       child = child.nextElementSibling) {
    child.removeAttribute('fit');
    removeExplicitSize(child, layout);
    if (child.tagName === AXIOM_CONTAINER) {
      if (layout === 'horizontal') {
        child.removeAttribute('horizontal');
        child.setAttribute('layout', '');
        child.setAttribute('vertical', '');
      } else {
        child.removeAttribute('vertical');
        child.setAttribute('layout', '');
        child.setAttribute('horizontal', '');
      }
    }
  }

  // See function definition why we need this.
  fixupSplitters(container);
};
