// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export var descriptor = {
  'id': 'wash',
  'version': '1.0.0',
  'requires': 'axiom-services^1.0.0',
  'extends': {
    'filesystems': {
      'define-filesystems': [
        {'name': 'wash', 'exePath': '.'}
      ]
    },

    'views': {
      'define-views': [
        {'id': 'terminal'}
      ]
    }
  }
};

export default descriptor;
