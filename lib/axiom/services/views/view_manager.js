// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

/**
 * Registry of views that can be placed in windows.
 */
export var ViewManager = function(moduleManager) {
  this.moduleManager_ = moduleManager;
  this.views_ = new Map();
  this.extensionBindings_ = new Set();
};

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
 * @param {string} tagName  The custom tag element used to create the view content
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
        var document = window.document;
        var frame = document.getElementsByTagName('axiom-frame');
        if (frame.length !== 1) {
          return Promise.reject(AxiomError.Runtime(
              'Document body should contain a single axiom-frame element'));
        }

        // TODO(rpaquay): Add support for adding more than a single view.
        var axiomView = document.createElement('axiom-view');
        axiomView.setAttribute('fit', '');
        frame[0].appendChild(axiomView);

        var element = document.createElement(view.tagName);
        axiomView.appendChild(element);

        view.element = element;
        // TODO(rpaquay): Call "onShow" on extension binding
        //view.element.onShow();
      });
    });
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
