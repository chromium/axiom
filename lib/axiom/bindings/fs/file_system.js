// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import BaseBinding from 'axiom/bindings/base';

export var FileSystem = function() {
  BaseBinding.call(this, {
    // Create an alias entry.
    alias: {type: 'method', args: ['pathSpecFrom', 'pathSpecTo']},

    // Create an open or execute context.
    createContext: {type: 'method', args: ['contextType', 'pathSpec', 'arg']},

    // Return an array of stat metadata for each entry in a directory.
    list: {type: 'method', args: ['pathSpec']},

    // Make a new directory.
    mkdir: {type: 'method', args: ['pathSpec']},

    // Move an entry from one location to another.
    move: {type: 'method', args: ['pathSpecFrom', 'pathSpecTo']},

    // Get metadata for a path.
    stat: {type: 'method', args: ['pathSpec']},

    // Remove a path.
    unlink: {type: 'method', args: ['pathSpec']},
  });
};

export default FileSystem;

FileSystem.prototype = Object.create(BaseBinding.prototype);
