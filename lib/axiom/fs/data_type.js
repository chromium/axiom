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

/**
 * @enum {string}
 *
 * List of acceptable values for the 'dataType' parameter used in stat and read
 * operations.
 */
export var DataType = {
  /**
   * When a dataType of 'arraybuffer' is used on read and write requests, the
   * data is expected to be an ArrayBuffer instance.
   *
   * NOTE(rginda): ArrayBuffer objects don't work over chrome.runtime ports,
   * due to http://crbug.com/374454.
   */
  ArrayBuffer: 'arraybuffer',

  /**
   * When used in read and write requests, the data will be a base64 encoded
   * string.  Note that decoding this value to a UTF8 string may result in
   * invalid UTF8 sequences or data corruption.
   */
  Base64String: 'base64-string',

  /**
   * In stat results, a dataType of 'blob' means that the file contains a set
   * of random access bytes.
   *
   * When a dataType of 'blob' is used on a read request, the data is expected
   * to be an instance of an opened Blob object.
   *
   * NOTE(rginda): Blobs can't cross origin over chrome.runtime ports.
   * Need to test over HTML5 MessageChannels.
   */
  Blob: 'blob',

  /**
   * Not used in stat results.
   *
   * When used in read and write requests, the data will be a UTF-8
   * string.  Note that if the underlying file contains sequences that cannot
   * be encoded in UTF-8, the result may contain invalid sequences or may
   * not match the actual contents of the file.
   */
  UTF8String: 'utf8-string',

  /**
   * In stat results, a dataType of 'value' means that the file contains a
   * single value which can be of any type.
   *
   * When an dataType of 'value' is used on a read request, the results of
   * the read will be the native type stored in the file.  If the file
   * natively stores a blob, the result will be a string.
   */
  Value: 'value'
};

export default DataType;
