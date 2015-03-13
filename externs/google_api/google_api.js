// Copyright 2015 Google Inc. All rights reserved.
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
 * @fileoverview Externs for Google APIs.
 *
 * @see Examples in https://developers.google.com/drive/v2/reference/
 *
 * @externs
 */

/**
 * @const
 */
var gapi = {};

/**
 * @constructor
 */
gapi.GDriveEntry = function() {
  /** @type {string} */
  this.title = '';
  /** @type {string} */
  this.mimeType = '';
  /** @type {number} */
  this.fileSize = 0;
  /** @type {number} */
  this.modifiedDate = 0;
  /** @type {boolean} */
  this.copyable = false;
  /** @type {string} */
  this.downloadUrl = '';
  /** @type {Object<string>} */
  this.exportLinks = {};
};

/**
 * @constructor
 */
gapi.AuthToken = function() {
  /** @type {string} */
  this.access_token = '';
};

/**
 * @const
 */
gapi.auth = {};

/**
* @param {...?} args
* @return {undefined}
*/
gapi.auth.authorize = function(args) {};

/**
* @return {gapi.AuthToken}
*/
gapi.auth.getToken = function() {};

gapi.client = {};

/**
* @param {...?} args
* @return {Object}
*/
gapi.client.load = function(args) {};

/**
* @param {...?} args
* @return {Object}
*/
gapi.client.request = function(args) {};

gapi.client.drive = {};
gapi.client.drive.files = {};

/**
* @param {...?} args
* @return {Object}
*/
gapi.client.drive.files.get = function(args) {};

/**
* @param {...?} args
* @return {Object}
*/
gapi.client.drive.files.insert = function(args) {};

/**
* @param {...?} args
* @return {Object}
*/
gapi.client.drive.files.list = function(args) {};
