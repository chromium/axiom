// Copyright (c) 2015 Google Inc. All rights reserved.
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

window.onload = function() {
	/*%*/ console.log("onload!"); /*%*/
  // TODO(ussuri): This won't be needed once owned URLs are registered with the
  // extension in CWS.
  var isInstalledMarker = document.createElement('div');
  isInstalledMarker.id = 'chrome-agent-is-installed';
  document.body.appendChild(isInstalledMarker);
  window.chromePort = chrome.runtime.connect({name: 'extension_stream'});
};
