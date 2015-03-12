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

import Path from 'axiom/fs/path';
import StatResult from 'axiom/fs/stat_result';
import AxiomError from 'axiom/core/error';

export var gdrivefsUtil = {};
export default gdrivefsUtil;

gdrivefsUtil.GOOGLE_API_URL_ = 'https://apis.google.com/js/client.js';
gdrivefsUtil.AXIOM_GDRIVE_API_SCOPES_ =
    [ 'https://www.googleapis.com/auth/drive'];
gdrivefsUtil.AXIOM_CLIENT_ID_ =
    '827197644441-94seon1kknalmqrafhhfteied7vk7tus.apps.googleusercontent.com';
gdrivefsUtil.DIR_MIME_TYPE_ = 'application/vnd.google-apps.folder';

/**
 * Load the script providing a general access to Google API, including GDrive.
 *
 * @return {!Promise} Result of the operation.
 */
gdrivefsUtil.loadGoogleApi = function() {
  return new Promise(function(resolve, reject) {
    if (window.gapi) {
      return resolve();
    } else {
      window.onGapiLoaded = function() {
        return resolve();
      };
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = gdrivefsUtil.GOOGLE_API_URL_ + '?onload=onGapiLoaded';
      script.onerror = function() {
        return reject(new AxiomError.Runtime('Google APIs not available'));
      };
      document.head.appendChild(script);
    }
  });
};

/**
 * Ask the current user to authorize Axiom to access (one of) their GDrive(s).
 *
 * @return {!Promise} Result of the operation.
 */
gdrivefsUtil.authenticateWithGDrive = function(useExisting) {
  return new Promise(function(resolve, reject) {
    var onAuthorize = function(authResult) {
      if (authResult && authResult.access_token) {
        // Access token has been successfully retrieved, requests can be sent
        // to the API.
        return resolve();
      } else if (useExisting) {
        // No access token could be retrieved, force the authorization flow.
        return resolve(gdrivefsUtil.authenticateWithGDrive(false));
      } else {
        return reject(new AxiomError.Runtime('Authentication failed'));
      }
    };

    // NOTE: This will display a pop-up to authorize the app and another pop-up
    // to select or login into a Google account on an as-needed basis.
    // If the user have already authorized the app's access to their GDrive,
    // access will be immediately granted, unless useExisting==false.
    gapi.auth.authorize(
        {
          client_id: gdrivefsUtil.AXIOM_CLIENT_ID_,
          scope: gdrivefsUtil.AXIOM_GDRIVE_API_SCOPES_,
          immediate: useExisting
        },
        onAuthorize
    );
  });
};

/**
 * Load the GDrive API client.
 *
 * @return {!Promise} Result of the operation.
 */
gdrivefsUtil.loadGDriveClient = function() {
  return new Promise(function(resolve, reject) {
    if (window.gapi && window.gapi.client && window.gapi.client.drive) {
      return resolve();
    } else {
      gapi.client.load('drive', 'v2', function() {
        // TODO(ussuri): Handle network errors.
        return resolve();
      });
    }
  });
};

/**
 * Load the GDrive API client.
 *
 * @return {!Promise} Result of the operation.
 */
gdrivefsUtil.initGDrive = function() {
  return gdrivefsUtil.loadGoogleApi().then(function() {
    return gdrivefsUtil.loadGDriveClient().then(function() {
      return gdrivefsUtil.authenticateWithGDrive(true);
    });
  });
};

/**
 * Get the metadata for the given GDrive entry.
 *
 * @private
 * @param {!string} entryId ID of the entry to get metadata for.
 * @return {!Promise<!Object>} Metadata for the entry.
 */
gdrivefsUtil.getEntry_ = function(entryId) {
  return new Promise(function(resolve, reject) {
    var request = gapi.client.drive.files.get({fileId: entryId});
    request.execute(function(response) {
      if (!response.error) {
        return resolve(response.item);
      } else if (response.error.code == 401) {
        // OAuth access token may have expired.
        // TODO(ussuri): Trigger reauthorization?
        return reject(new AxiomError.Runtime(response.error.message));
      } else {
        return reject(new AxiomError.Runtime(response.error.message));
      }
    });
  });
};

/**
 * Get the entry for the given GDrive absolute path.
 *
 * @param {Path} path The absolute path of an entry to search for.
 * @return {!Promise<!Object>} The found entry.
 */
gdrivefsUtil.getEntry = function(path) {
  // Resolve the path level-by-level by forming a chain of Promises that are
  // sequentially dependent on each other, starting with the top level with the
  // special alias 'root'.
  // TODO(ussuri): See TODO in getChildEntry_. In addition to a possibly
  // incomplete list of results, here we can get a false negative since we
  // don't traverse the whole graph of paths.
  var resolveChild = function(saughtElt, saughtMimeType, parentDir) {
    return gdrivefsUtil.getChildEntry_(parentDir.id, saughtElt, saughtMimeType);
  };

  var promise = new Promise(function(resolve, reject) {
    return resolve({id: 'root'});
  });
  for (var i = 0; i < path.elements.length; ++i) {
    // NOTE: curry the closure via bind() to freeze the current i.
    var mimeType =
        i < path.elements.length - 1 ? gdrivefsUtil.DIR_MIME_TYPE_ : undefined;
    promise = promise.then(resolveChild.bind(null, path.elements[i], mimeType));
  }
  return promise;
};

/**
 * Get a child entry with the given name inside a given directory.
 *
 * @private
 * @param {!string} parentId ID of the directory to search in.
 * @param {!string} childName Name (title in GDrive terms) of a child to find.
 * @param {string=} opt_mimeType Optional MIME type of a child to find.
 * @return {!Promise<!Object>} Metadata for the entry.
 */
gdrivefsUtil.getChildEntry_ = function(parentId, name, opt_mimeType) {
  return new Promise(function(resolve, reject) {
    // TODO(ussuri): It may be necessary to escape possible quotes in `name`.
    var query =
        '"' + parentId + '" in parents' +
        ' and title="' + name + '"' +
        ' and trashed=false' +
        (opt_mimeType ? (' and mimeType="' + opt_mimeType + '"') : '');
    var request = gapi.client.drive.files.list({
        folderId: parentId,
        q: query
    });

    request.execute(function(response) {
      if (!response.error) {
        // TODO(ussuri): This doesn't account for possible entries with the same
        // name on each level of the path, which GDrive permits, which may
        // yield a an incomplete list of results.
        return resolve(response.items[0]);
      } else if (response.error.code == 401) {
        // OAuth access token may have expired.
        // TODO(ussuri): Auto-trigger reauthorization?
        return reject(new AxiomError.Runtime(response.error.message));
      } else {
        return reject(new AxiomError.Runtime(response.error.message));
      }
    });
  });
};

/**
 * Get 'stat' value for the given GDrive entry.
 *
 * @private
 * @param {!gapi.GDriveEntry} entry A GDrive entry to stat.
 * @return {!StatResult} The stat object for the entry.
 */
gdrivefsUtil.entryToStat_ = function(entry) {
  if (entry.mimeType === gdrivefsUtil.DIR_MIME_TYPE_) {
    return new StatResult({
      mode: Path.Mode.R | Path.Mode.D,
      mtime: new Date(entry.modifiedDate).getTime(),
    });
  } else {
    // TODO(ussuri): There are many ways to determine the below from entry.
    // Make sure this is 100% reliable and exhaustive.
    // See https://developers.google.com/drive/v2/reference/files.
    // 1) Only "real" files have `downloadUrl` on them. GDrive docs have
    // `exportLinks` instead.
    // 2) Some Google docs may not even have the latter (e.g. GMap's
    // My Places).
    // 3) `copyable` might be mutually redundant with the other two.
    // 4) Err on the safer side when assigning 'W' mode: `editable`
    // may be enough, but further limit it to real files, even though
    // Google docs can be theoretically updated via the API.
    var mode = 0;
    if (entry.copyable && (entry.downloadUrl || entry.exportLinks)) {
      mode |= Path.Mode.R | Path.Mode.K;
    }
    if (entry.editable && entry.downloadUrl) {
      mode |= Path.Mode.W;
    }
    return new StatResult({
      dataType: 'blob',
      mimeType: entry.mimeType,
      mode: mode,
      mtime: new Date(entry.modifiedDate).getTime(),
      size: entry.fileSize // Can be 'undefined' for Google docs.
    });
  }
};

/**
 * Get 'stat' value for a GDrive entry with the given absolute path.
 *
 * @param {Path} path Path to a GDrive entry to stat.
 * @return {!Promise<!StatResult>} The stat object for the entry.
 */
gdrivefsUtil.statEntry = function(path) {
  return gdrivefsUtil.getEntry(path).then(
      /** @type {function(?)} */ function(entry) {
    return gdrivefsUtil.entryToStat_(entry);
  });
};

/**
 * Download the content of a resource with the given URL.
 *
 * @private
 * @param {!string} url File's URL.
 * @return {!Promise<!string>} A string with the file contents.
 */
gdrivefsUtil.downloadUrl_ = function(url) {
  return new Promise(function(resolve, reject) {
    // TODO(ussuri): Make sure we're authorized?
    var accessToken = gapi.auth.getToken().access_token;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.onload = function() {
      return resolve(xhr.responseText);
    };
    xhr.onerror = function() {
      return reject(new AxiomError.Runtime(
          'Failed to download file: ' + xhr.statusText));
    };
    xhr.send();
  });
};

/**
 * Download the content of a GDrive file.
 *
 * @private
 * @param {!gapi.GDriveEntry} entry The GDrive file to download.
 * @param {string=} opt_mimeType The desired MIME type:
 *       1) for "normal" files, must either match the file's type or be falsy;
 *       2) for GDrive docs, must either match one of the conversion formats
 *          provided by GDrive for this file be falsy. If falsy, one of the
 *          simplest text formats is auto-selected (text/plain, text/csv etc.)
 * @return {Promise<string>} A string with the file contents.
 */
gdrivefsUtil.downloadFile_ = function(entry, opt_mimeType) {
  if (entry.downloadUrl) {
    // A "normal" file, whose contents is stored directly in GDrive.
    if (opt_mimeType && entry.mimeType !== opt_mimeType) {
      return Promise.reject(new AxiomError.NotFound(
          'file/MIME type', entry.title + ':' + opt_mimeType));
    }
    return gdrivefsUtil.downloadUrl_(entry.downloadUrl);
  } else if (entry.exportLinks) {
    // A Google doc, stored outside GDrive but available for conversion.
    var mimeType;
    if (opt_mimeType) {
      if (!entry.exportLinks[opt_mimeType]) {
        return Promise.reject(new AxiomError.Incompatible(
            'file/MIME type conversion', entry.title + ':' + opt_mimeType));
      }
      mimeType = opt_mimeType;
    } else {
      if (entry.exportLinks['text/plain']) {
        mimeType = 'text/plain';
      } else if (entry.exportLinks['text/csv']) {
        mimeType = 'text/csv';
      } else {
        return Promise.reject(new AxiomError.NotFound(
            'simple text conversion', entry.title));
      }
    }
    return gdrivefsUtil.downloadUrl_(entry.exportLinks[mimeType]);
  } else {
    // A Google doc unavailable for conversion (e.g. Google My Maps).
    return Promise.reject(new AxiomError.NotFound('file', entry.title));
  }
};

/**
 * Download the content of a GDrive file with the given URL.
 *
 * @param {Path} path The path of the GDrive file to download.
 * @param {string=} opt_mimeType The desired MIME type:
 *       1) for "normal" files, must either be falsy or match the file's type;
 *       2) for GDrive docs, must match one of the conversion formats provided
 *          by GDrive for this file.
 * @return {!Promise<!string>} A string with the file contents.
 */
gdrivefsUtil.downloadFile = function(path, opt_mimeType) {
  return gdrivefsUtil.getEntry(path).then(
      /** @type {function(?)} */ function(entry) {
    return gdrivefsUtil.downloadFile_(entry, opt_mimeType);
  });
};

/**
 * Create a new empty GDrive file.
 *
 * @private
 * @param {!string} parentDirId The entry ШВ of the directory to put the file in.
 * @param {!string} name The name of the file.
 * @param {string=} opt_mimeType The data's MIME type.
 * @return {!Promise} Operation's completion.
 */
gdrivefsUtil.createFile_ = function(parentDir, name, opt_mimeType) {
  var mimeType = opt_mimeType || 'text/plain';
  return new Promise(function(resolve, reject) {
    var request = gapi.client.drive.files.insert({
        uploadType: 'media',
        parents: [parentDir],
        title: name,
        mimeType: mimeType
    });
    request.execute(function(response) {
      if (!response.error) {
        return resolve(response);
      } else if (response.error.code == 401) {
        // OAuth access token may have expired.
        // TODO(ussuri): Auto-trigger reauthorization?
        return reject(new AxiomError.Runtime(response.error.message));
      } else if (response.error.code == 500 ||
                 response.error.code == 502 ||
                 response.error.code == 503 ||
                 response.error.code == 504) {
        // TODO(ussuri): These errors are transient: should retry uploading.
        return reject(new AxiomError.Runtime(response.error.message));
      } else {
        return reject(new AxiomError.Runtime(response.error.message));
      }
    });
  });
};

/**
 * Upload a new GDrive file with the given contents.
 *
 * @private
 * @param {!Object} file The file entry to update.
 * @param {!string} data The file's data.
 * @return {!Promise} Operation's completion.
 */
gdrivefsUtil.updateFile_ = function(file, data) {
  return new Promise(function(resolve, reject) {
    // NOTE: Google API docs are inconsistent. The relevan page first describes
    // the gapi.client.drive.files.update API, then uses gapi.client.request
    // as below in the example.
    var request = gapi.client.request({
      path: '/upload/drive/v2/files/' + file.id,
      method: 'PUT',
      params: {
        uploadType: 'media'
      },
      body: data
    });
    request.execute(function(response) {
      if (!response.error) {
        return resolve();
      } else if (response.error.code == 401) {
        // OAuth access token may have expired.
        // TODO(ussuri): Auto-trigger reauthorization?
        return reject(new AxiomError.Runtime(response.error.message));
      } else if (response.error.code == 500 ||
                 response.error.code == 502 ||
                 response.error.code == 503 ||
                 response.error.code == 504) {
        // TODO(ussuri): These errors are transient: should retry uploading.
        return reject(new AxiomError.Runtime(response.error.message));
      } else {
        return reject(new AxiomError.Runtime(response.error.message));
      }
    });
  });
};

/**
 * Upload a new GDrive file with the given contents.
 *
 * @param {Path} path The path of the new file.
 * @param {!string} data The file's data.
 * @param {!string} mimeType The data's MIME type.
 * @return {!Promise} Operation's completion.
 */
gdrivefsUtil.uploadFile = function(path, data, opt_mimeType) {
  var parentPath = path.getParentPath();
  var baseName = path.getBaseName();
  return gdrivefsUtil.getEntry(parentPath)
      .then(function(parentDir) {
    return gdrivefsUtil.createFile_(parentDir, baseName, opt_mimeType)
        .then(function(file) {
      return gdrivefsUtil.updateFile_(file, data);
    });
  });
};

/**
 * Get a list of direct children of a given directory.
 *
 * @private
 * @param {!string} entryId The entry ID of the directory to list.
 * @return {!Promise<!Object<string, StatResult>>} Array of entries.
 */
gdrivefsUtil.listDirectory_ = function(dirId) {
  return new Promise(function(resolve, reject) {
    var request = gapi.client.drive.files.list({
        q: '"' + dirId + '" in parents and trashed = false'
    });

    request.execute(function(response) {
      if (!response.error) {
        var stats = {};
        for (var i = 0; i < response.items.length; ++i) {
          var entry = response.items[i];
          stats[entry.title] = gdrivefsUtil.entryToStat_(entry);
        }
        return resolve(stats);
      } else if (response.error.code == 401) {
        // OAuth access token may have expired.
        // TODO(ussuri): Auto-trigger reauthorization?
        return reject(new AxiomError.Runtime(response.error.message));
      } else {
        return reject(new AxiomError.Runtime(response.error.message));
      }
    });
  });
};

/**
 * Get a list of direct children of a given directory.
 *
 * @param {Path} path The absolute path of the directory to list.
 * @return {!Promise<!Object<string, StatResult>>} Array of entries.
 */
gdrivefsUtil.listDirectory = function(path) {
  return gdrivefsUtil.getEntry(path).then(function(entry) {
    return gdrivefsUtil.listDirectory_(entry.id);
  });
};

// /**
//  * Removes all files and sub directories for a given path.
//  */
// gdrivefsUtil.remove = function(root, path) {
//   return new Promise(function(resolve, reject) {
//     ...
//   });
// };

// /**
//  * Create a directory with a given name under root.
//  */
// gdrivefsUtil.mkdir = function(root, name) {
//   return new Promise(function(resolve, reject) {
//     ...
//   });
// };
