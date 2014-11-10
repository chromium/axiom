console.log("axiom-view-manager.js");

/*
  Invariants of the ViewManager, Containers and Views:
  * The top level element is an "axiom-frame" with no particular layout. It serves as the "root"
    of what the view manager is aware of.
  * The frame contains one element at most: either a view or a container.
  * The frame element must have the "fit" attribute
  * If the frame element is a container, the layout can be vertical or horizontal.
  * Containers are elements used for grouping 2 or more sub-elements in a given
    direction (vertical or horizontal). A container contains a sequence of Containers
    (in the opposite layout direction only) and Views, all separated by Splitters.
  * All sub-elements are fixed size (width or height, dependending on the layout direction),
    except for one which is "flex".
  * A View is the frame around any custom view content. A view is always inside either a Container
    or the top level frame (special case of a frame with a single view).
 */
var AXIOM_CONTAINER = "AXIOM-CONTAINER";
var AXIOM_FRAME = "AXIOM-FRAME";
var AXIOM_SPLITTER = "AXIOM-SPLITTER";
var AXIOM_VIEW = "AXIOM-VIEW";

var assert = function (cond, message, text) {
  if (!message)
    message = "Assertion failed";
  if (!text)
    text = "";

  if (!cond) {
    throw new Error(message, message + ": " + text);
  }
}

var assertEq = function (value, expectedValue, message) {
  if (value === expectedValue)
    return;

  assert(false, "Value " + value + " is not the expected value " + expectedValue, message);
}

var assertNe = function (value, expectedValue, message) {
  if (value !== expectedValue)
    return;

  assert(false, "Value " + value + " should not be equal to " + expectedValue, message);
}

var assertGe = function (value, expectedValue, message) {
  if (value >= expectedValue)
    return;

  assert(false, "Value " + value + " is expected to be >= " + expectedValue, message);
}

var assertLe = function (value, expectedValue, message) {
  if (value <= expectedValue)
    return;

  assert(false, "Value " + value + " is expected to be <= " + expectedValue, message);
}

var assertIn = function (value, expectedValues, message) {
  for (var i = 0; i < expectedValues.length; i++) {
    if (value === expectedValues[i])
      return;
  }
  var expectedValuesPrint = "[";
  for (var i = 0; i < expectedValues.length; i++) {
    if (i > 0)
      expectedValuesPrint += ",";

    expectedValuesPrint += expectedValues[i];
  }
  expectedValuesPrint += "]";
  assert(false, "Value " + value + " is one of " + expectedValuesPrint, message);
}

var assertValidView = function (view) {
  assertEq(view.tagName, AXIOM_VIEW);
  var parent = view.parentElement;
  assertIn(parent.tagName, [AXIOM_CONTAINER, AXIOM_FRAME]);
  if (parent.tagNane === AXIOM_CONTAINER) {
    assertGe(parent.children.length, 2, "container must have more than one view");
  }
}

var assertValidContainer = function(container) {
  assertEq(container.tagName, AXIOM_CONTAINER);
  assertIn(container.parentElement.tagName, [AXIOM_FRAME, AXIOM_CONTAINER]);
  assert(container.hasAttribute("layout"));

  if (container.parentElement.tagName === AXIOM_CONTAINER) {
    var direction = (container.parentElement.hasAttribute("vertical") ? "horizontal" : "vertical");
    assert(container.hasAttribute(direction));
  } else {
    assert(container.hasAttribute("horizontal") || container.hasAttribute("vertical"));
    assert(container.hasAttribute("fit"));
  }

  for (var i = 0; i < container.children.length; i++) {
    var child = container.children[i];
    if ((i % 2) == 0) {
      assertIn(child.tagName, [AXIOM_CONTAINER, AXIOM_VIEW]);
      if (child.tagName == AXIOM_CONTAINER) {
        assertValidContainer(child);
      } else {
        assertValidView(child);
      }
    } else {
      assertEq(child.tagName, AXIOM_SPLITTER);
    }
  }
}

var assertValidFrame = function(frame) {
  assertEq(frame.tagName, AXIOM_FRAME);
  assertLe(frame.children.length, 1);

  var child = frame.firstElementChild;
  if (child !== null) {
    assertIn(child.tagName, [AXIOM_CONTAINER, AXIOM_VIEW]);
    if (child.tagName === AXIOM_CONTAINER) {
      assertValidContainer(child);
    } else {
      assertValidView(child);
    }
  }
}

function fixupSplitters(frame) {
  for (var child = frame.firstElementChild; child !== null; child = child.nextElementSibling) {
    if (child.tagName === AXIOM_SPLITTER) {
      child.directionChanged();
    } else {
      fixupSplitters(child);
    }
  }
}

var ContainerWrapper = function(rawContainer) {
  this.rawContainer_ = rawContainer;
}

var ViewWrapper = function (rawView) {
  assertValidView(rawView);
  this.rawView_ = rawView;
  this.rawContainer_ = rawView.parentElement;
  this.container_ = new ContainerWrapper(this.rawContainer_);
}

ViewWrapper.prototype.isInsideFrame = function () {
  return this.rawContainer_.tagName === AXIOM_FRAME;
}

ViewWrapper.prototype.detachFromParent = function (newParent) {
  if (newParent)
    newParent.appendChild(this.rawView_);
  else
    this.rawContainer_.removeChild(this.rawView_);
}

ViewWrapper.prototype.hasSingleSibling = function () {
  var siblingCount = 0;
  for (var child = this.rawContainer_.firstElementChild; child !== null; child = child.nextElementSibling) {
    if (child.tagName === AXIOM_VIEW || child.tagName === AXIOM_CONTAINER) {
      if (child !== this.rawView_) {
        siblingCount++;
      }
    }
  }
  return siblingCount === 1;
}

ViewWrapper.prototype.getOtherSiblingElement = function () {
  var siblingCount = 0;
  for (var child = this.rawContainer_.firstElementChild; child !== null; child = child.nextElementSibling) {
    if (child.tagName === AXIOM_VIEW || child.tagName === AXIOM_CONTAINER) {
      if (child !== this.rawView_) {
        return child;
      }
    }
  }
  assert(false, "Element should have at least one sibling.");
}

ViewWrapper.prototype.getContainerElement = function () {
  return this.rawContainer_;
}

ViewWrapper.prototype.isFirstChild = function () {
  return this.rawView_.previousElementSibling === null;
}

var ViewManager = function (axiomFrame) {
  this.axiomFrame_ = axiomFrame;
}

ViewManager.prototype.attachView = function (container, position, view) {
}

ViewManager.prototype.makeSingleViewFrame = function(frame, view) {
  view.setAttribute("fit", "");
  view.style.removeProperty("width");
  view.style.removeProperty("height");
  return view;
}

ViewManager.prototype.getParentFrame = function (element) {
  while (element) {
    if (element.tagName === AXIOM_FRAME)
      return element;
    element = element.parentElement;
  }
  return null;
}

// @view: The AXIOM-VIEW to move
// @target: The element (view, container or frame) @view moves relative to. 
// @position: "left", "right", "top", "bottom": where to move the view relative to @target.
ViewManager.prototype.moveView = function (view, target, position) {
  assertValidView(view);
  assert(!!target);
  assertNe(view, target);
  assertIn(position, ["left", "right", "top", "bottom"]);

  var frame = this.getParentFrame(target);
  if (!frame)
    return;

  // Remove the view and re-grunt. Note this may remove the container from 
  // the frame.
  this.detachView(view);

  // Insertion into the main frame is a special case, as the main frame
  // is neither horizontal or vertical.
  assertValidFrame(frame);
  if (target.tagName === AXIOM_FRAME) {
    this.moveViewIntoFrame(view, target, position);
  } else if (target.tagName === AXIOM_CONTAINER) {
    this.moveViewIntoContainer(view, target, position);
  } else if (target.tagName === AXIOM_VIEW) {
    this.moveViewNextToView(view, target, position);
  }
  assertValidFrame(frame);
}

ViewManager.prototype.moveViewIntoContainer = function (view, targetContainer, position) {
  assertEq(targetContainer.tagName, AXIOM_CONTAINER);
  var parent = targetContainer.parentElement;
  assert(!!parent, "Container has been deleted (no parent)");
  assertIn(parent.tagName, [AXIOM_FRAME, AXIOM_CONTAINER]);

  var layout = targetContainer.hasAttribute("vertical") ? "vertical" : "horizontal";
  var containerIsCompatible =
      (layout === "vertical" && (position == "top" || position === "bottom")) ||
      (layout === "horizontal" && (position == "left" || position === "right"));
  // If inserting inside a compatible container, we only need to insert
  // the child and re-grout
  if (containerIsCompatible) {
    if (position === "left" || position === "top") {
      targetContainer.insertBefore(view, targetContainer.firstElementChild);
    } else {
      targetContainer.appendChild(view);
    }
    this.groutContainer(targetContainer);
  } else {
    // Inserting inside an "incompatible" container: we need
    // a new container in the other direction, and insert the view
    // there.
    var newContainer = document.createElement(AXIOM_CONTAINER);
    if (parent.tagName === AXIOM_FRAME)
      newContainer.setAttribute("fit", "");
    newContainer.setAttribute("layout", "");
    newContainer.setAttribute(layout === "vertical" ? "horizontal" : "vertical", "");
    parent.replaceChild(newContainer, targetContainer);
    if (position === "left" || position === "top") {
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
}

ViewManager.prototype.moveViewNextToView = function (view, targetView, position) {
  var targetWrapper = new ViewWrapper(targetView);
  if (targetWrapper.isInsideFrame()) {
    return this.moveViewIntoFrame(view, targetWrapper.getContainerElement(), position);
  }

  // The view is inside a container
  var targetContainer = targetWrapper.getContainerElement();

  assertEq(targetContainer.tagName, AXIOM_CONTAINER);
  var layout = targetContainer.hasAttribute("vertical") ? "vertical" : "horizontal";
  var containerIsCompatible =
      (layout === "vertical" && (position == "top" || position === "bottom")) ||
      (layout === "horizontal" && (position == "left" || position === "right"));
  // If inserting inside a compatible container, we only need to insert
  // the child and re-grout
  if (containerIsCompatible) {
    if (position === "left" || position === "top") {
      targetContainer.insertBefore(view, targetView);
    } else {
      targetContainer.insertBefore(view, targetView.nextElementSibling);
    }
    this.groutContainer(targetContainer);
  } else {
    // Inserting inside an "incompatible" container: we need
    // a new container in the other direction, and insert the view
    // there.
    var newContainer = document.createElement(AXIOM_CONTAINER);
    newContainer.setAttribute("layout", "");
    newContainer.setAttribute(layout === "vertical" ? "horizontal" : "vertical", "");
    targetContainer.replaceChild(newContainer, targetView);
    if (position === "left" || position === "top") {
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
}

ViewManager.prototype.moveViewIntoFrame = function(view, frame, position) {
  // The frame is empty, makes the view fit its entire area.
  if (frame.children.length === 0) {
    this.makeSingleViewFrame(frame, view);
    frame.appendChild(view);
    return view;
  } else {
    assertEq(frame.children.length, 1);
    var child = frame.children[0];
    if (child.tagName == AXIOM_VIEW) {
      var newContainer = document.createElement(AXIOM_CONTAINER);
      newContainer.setAttribute("fit", "");
      newContainer.setAttribute("layout", "");
      newContainer.setAttribute(position === "left" || position === "right" ? "horizontal" : "vertical", "");
      if (position === "left" || position === "top") {
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
      assertEq(child.tagName, AXIOM_CONTAINER);
      var layout = child.hasAttribute("vertical") ? "vertical" : "horizontal";
      var containerIsCompatible =
      (layout === "vertical" && (position == "top" || position === "bottom")) ||
      (layout === "horizontal" && (position == "left" || position === "right"));
      // If inserting inside a compatible container, we only need to insert
      // the child and re-grout
      if (containerIsCompatible) {
        if (position === "left" || position === "top") {
          child.insertBefore(view, child.firstChild);
        } else {
          child.appendChild(view);
        }
        this.groutContainer(child);
      } else {
        // Inserting inside an "incompatible" container: we need
        // a new container in the other direction, and insert the view
        // there.
        var newContainer = document.createElement(AXIOM_CONTAINER);
        newContainer.setAttribute("fit", "");
        newContainer.setAttribute("layout", "");
        newContainer.setAttribute(layout === "vertical" ? "horizontal" : "vertical", "");
        if (position === "left" || position === "top") {
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
}

ViewManager.prototype.detachView = function (rawView, newParent) {
  var view = new ViewWrapper(rawView);
  // Special case of single (and last) view inside main frame.
  if (view.isInsideFrame()) {
    view.detachFromParent(newParent);
    return view;
  }

  // Special case: the view has only one sibling. We need to move the sibling
  // to the parent container.
  if (view.hasSingleSibling()) {
    var sibling = view.getOtherSiblingElement();
    var container = view.getContainerElement();
    assertEq(container.tagName, AXIOM_CONTAINER);
    var containerWidth = container.style.getPropertyValue("width");
    var containerHeight = container.style.getPropertyValue("height");
    var parent = container.parentElement;
    view.detachFromParent(newParent);

    // This takes care of removing the splitter and other sibling view
    parent.replaceChild(sibling, container);
    if (parent.tagName === AXIOM_FRAME) {
      this.makeSingleViewFrame(parent, sibling);
      return view;
    } else {
      // Recompute layout of the container, after removing "flex" from this view
      // as the container must have a flex view already.
      // Transfer the old container width/height to the new sibling element,
      // to avoid having the corresponding area change size when the ownership transfers.
      sibling.removeAttribute("flex");
      if (parent.hasAttribute("horizontal")) {
        sibling.style.width = containerWidth;
      } else {
        sibling.style.height = containerHeight;
      }
      this.groutContainer(parent);
      return view;
    }
  }

  // General case: removing a view from a collection of siblings (2 or more)
  var container = view.getContainerElement();
  view.detachFromParent(newParent);
  this.groutContainer(container);
  return view;
}

// Ensure the set of element inside [container] are layed out according to
// the invariants of a Container constraints.
ViewManager.prototype.groutContainer = function (container) {
  assertEq(container.tagName, AXIOM_CONTAINER);

  var layout = (container.hasAttribute("vertical") ? "vertical" : "horizontal");

  // If we have any child container with the same layout as ours,
  // transfer its children to our list of children.
  for (var child = container.firstElementChild; child != null;) {
    var nextChild = child.nextElementSibling;
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
  for (var child = container.firstElementChild; child != null;) {
    var nextChild = child.nextElementSibling;
    if ((index % 2) == 0) {
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
          var splitter = document.createElement(AXIOM_SPLITTER);
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
  for (var i = 0; i < container.children.length; i++) {
    var child = container.children[i];
    if ((i % 2) === 0) {
      assertIn(child.tagName, [AXIOM_VIEW, AXIOM_CONTAINER]);
    } else {
      assertEq(child.tagName, AXIOM_SPLITTER);
    }
  }

  // Ensure there is exactly one element with the "flex" attribute
  var flexChildIndex = -1;
  for (var i = 0; i < container.children.length; i++) {
    var child = container.children[i];
    if (child.hasAttribute("flex")) {
      if (flexChildIndex === -1) {
        flexChildIndex = i;
      } else {
        child.removeAttribute("flex");
      }
    }
  }

  // If the container has no "flex" element, pick the first child
  // as the de factor "flex".
  // TODO(rpaquay): This behavior seems questionable. Figure out a
  // better way to address this corner case.
  if (flexChildIndex === -1) {
    container.children[0].setAttribute("flex", "");
    flexChildIndex = 0;
  }

  // Ensure all splitters point "away" from the "flex" child, e.g
  // "left" | "left" | "flex" | "right" | "right" or
  // "up" | "up" | "flex" | "down" | "down".
  for (var i = 0; i < container.children.length; i++) {
    var child = container.children[i];
    if (child.tagName === AXIOM_SPLITTER) {
      assertIn(layout, ["vertical", "horizontal"]);
      var direction;
      if (layout === "horizontal") {
        direction = (i < flexChildIndex ? "left" : "right");
      } else {
        direction = (i < flexChildIndex ? "up" : "down");
      }
      child.setAttribute("direction", direction);
    }
  }

  function removeExplicitSize(element, parentLayout) {
    if (element.hasAttribute("flex")) {
      element.style.removeProperty("width");
      element.style.removeProperty("height");
      return;
    }

    // Set default size if there is none
    // TODO(rpaquay): This behavior seems questionable. Figure out a
    // better way to address this corner case.
    if (element.tagName !== AXIOM_SPLITTER) {
      if (parentLayout === "vertical") {
        element.style.removeProperty("width");
        if (window.getComputedStyle(element).height === "0px") {
          element.style.height = "200px";
        }
      } else {
        element.style.removeProperty("height");
        if (window.getComputedStyle(element).width === "0px") {
          element.style.width = "200px";
        }
      }
    }
  }

  // Update layout attribute of all non splitter elements
  for (var child = container.firstElementChild; child !== null; child = child.nextElementSibling) {
    child.removeAttribute("fit");
    removeExplicitSize(child, layout);
    if (child.tagName === AXIOM_CONTAINER) {
      if (layout === "horizontal") {
        child.removeAttribute("horizontal");
        child.setAttribute("layout", "");
        child.setAttribute("vertical", "");
      } else {
        child.removeAttribute("vertical");
        child.setAttribute("layout", "");
        child.setAttribute("horizontal", "");
      }
    }
  }

  // See function definition why we need this.
  fixupSplitters(container);
}
