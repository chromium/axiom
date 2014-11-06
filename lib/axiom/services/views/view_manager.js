// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

/**
 * Registry of views that can be placed in windows.
 */
export var ViewManager = function(moduleManager) {
  this.moduleManager_ = moduleManager;
  this.views_ = {};
  this.extensionBindings_ = [];
};

export default ViewManager;

ViewManager.prototype.bind = function(serviceBinding) {
  serviceBinding.bind(this, {
    'onExtend': this.onExtend,
    'register': this.register,
    'unregister': this.unregister,
    'show': this.show,
    'hide': this.hide,
  });

  serviceBinding.ready();
};

/**
 * Extending the View Manager adds new view types.
 *
 * The extension descriptor should provide a unique id for each view.  The
 * binding should provide 'show' and 'hide' callbacks.
 */
ViewManager.prototype.onExtend = function(extensionBinding) {
  this.extensionBindings_.push(extensionBinding);
  var defineViews = extensionBinding.descriptor['define-views'];
  for (var id in defineViews) {
    this.views_[id] = {
      descriptor: defineViews[id],
      extensionBinding: extensionBinding
    };
  }
};

/**
 * Register a view given a unique id and a custom element.
 */
ViewManager.prototype.register = function(id, tagName) {
  var view = this.views_[id];
  if (view)
    return Promise.reject(AxiomError.Duplicate('view', id));

  this.views_[id] = {
    tagName: tagName,
  };
};

/**
 * Unregister a view given its id.
 */
ViewManager.prototype.unregister = function(viewId) {
  var view = this.views_[viewId];
  if (!view)
    return Promise.reject(AxiomError.NotFound('view', viewId));

  delete this.views_[viewId];
};

/**
 * Display a view given it id and location information.
 */
ViewManager.prototype.show = function(viewId, args) {
  var view = this.views_[viewId];
  if (!view)
    return Promise.reject(AxiomError.NotFound('view', viewId));

  var windowsService = this.moduleManager_.getServiceBinding('windows@axiom');
  return windowsService
    .whenLoadedAndReady()
    .then(function() {
      // TODO(rpaquay): 'main-window' should not be hard coded.
      return windowsService.openWindow('main-window').then(function(window) {
        var document = window.document;
        var frame = document.getElementsByTagName('axiom-frame');
        var element = document.createElement(view.tagName);
        frame.appendChild(view.element);
        view.element.onShow();
      });
    });
  //var promise = new Promise(function(resolve, reject) {
  //  if (!view.element) {
  //    window.chrome.app.window.create(
  //      'index.html',
  //      {
  //        id: 'mainWindow',
  //        bounds: { width: 800, height: 600 }
  //      },
  //      function(appWindow) {
  //        var document = appWindow.contentWindow.document;

  //        var frame = document.createElement('axiom-frame');
  //        document.body.appendChild(frame);

  //        var element = document.createElement(view.tagName);
  //        frame.appendChild(view.element);
  //        view.element.onShow();
  //        resolve('Success');
  //      }
  //    );
  //  } else {
  //    view.element.onShow();
  //    resolve('Success');
  //  }
  //});

  //return promise;
};

ViewManager.prototype.hide = function(viewId, args) {
  var view = this.views_[viewId];
  if (!view)
    return Promise.reject(AxiomError.NotFound('view', viewId));
};
