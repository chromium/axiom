// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';
import AxiomEvent from 'axiom/core/event';

import BaseBinding from 'axiom/bindings/base';
import FileSystemBinding from 'axiom/bindings/fs/file_system';

/**
 * A binding that represents an open file on a FileSystem.
 *
 * You should only create an OpenContext by calling an instance of
 * FileSystemBinding..createContext('open', ...).
 *
 * The arg parameter should be an object.  The only recognized property
 * is 'mode', and may contain one or more of the following properties to
 * override the default open mode.
 *
 *   mode {
 *     create: false, True to create the file if it doesn't exist,
 *     exclusive: false, True to fail if create && file exists.
 *     truncate: false, True to empty the file after opening.
 *     read: true, True to enable read operations.
 *     write: false, True to enable write operations.
 *   }
 *
 * @param {FileSystemBinding} fileSystem The parent file system.
 * @param {string} pathSpec
 * @param {Object} arg
 */
export var OpenContext = function(fileSystem, pathSpec, arg) {
  BaseBinding.call(this);

  this.describeMethod('open', {type: 'method', arg: []},
                      this.open_.bind(this));
  this.describeMethod('seek', {type: 'method', arg: ['arg']},
                      this.seek_.bind(this));
  this.describeMethod('read', {type: 'method', arg: ['arg']},
                      this.read_.bind(this));
  this.describeMethod('write', {type: 'method', arg: ['arg']},
                      this.write_.bind(this));

  this.fileSystem = fileSystem;

  this.pathSpec = pathSpec;

  var mode = (arg && arg.mode && typeof arg.mode == 'object') ? arg.mode : {};
  this.mode = {
    create: !!mode.create,
    exclusive: !!mode.exclusive,
    truncate: !!mode.truncate,
    read: !!mode.read,
    write: !!mode.write
  };

  if (!mode)
    this.mode.read = true;

  // If the parent file system is closed, we close too.
  this.dependsOn(this.fileSystem);

  // An indication that the open() method was called.
  this.didOpen_ = false;
};

export default OpenContext;

OpenContext.prototype = Object.create(BaseBinding.prototype);

/**
 * List of acceptable values for the 'dataType' parameter used in stat and read
 * operations.
 */
OpenContext.dataTypes = [
    /**
     * Not used in stat results.
     *
     * When a dataType of 'arraybuffer' is used on read and write requests, the
     * data is expected to be an ArrayBuffer instance.
     *
     * NOTE(rginda): ArrayBuffer objects don't work over chrome.runtime ports,
     * due to http://crbug.com/374454.
     */
    'arraybuffer',

    /**
     * Not used in stat results.
     *
     * When used in read and write requests, the data will be a base64 encoded
     * string.  Note that decoding this value to a UTF8 string may result in
     * invalid UTF8 sequences or data corruption.
     */
    'base64-string',

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
    'blob',

    /**
     * Not used in stat results.
     *
     * When used in read and write requests, the data will be a UTF-8
     * string.  Note that if the underlying file contains sequences that cannot
     * be encoded in UTF-8, the result may contain invalid sequences or may
     * not match the actual contents of the file.
     */
    'utf8-string',

    /**
     * In stat results, a dataType of 'value' means that the file contains a
     * single value which can be of any type.
     *
     * When a dataType of 'value' is used on a read request, the results of
     * the read will be the native type stored in the file.  If the file
     * natively stores a blob, the result will be a string.
     */
    'value',
  ];

/**
 * Sanity check an inbound arguments.
 *
 * @param {Object} arg The arguments object to check.
 *
 * @return {Promise<>} Promise rejects with an AxiomError if the check fails,
 *   resolves with no value if the check passes.
 */
OpenContext.prototype.checkArg_ = function(arg) {
  // If there's an offset, it must be a number.
  if ('offset' in arg && typeof arg.offset != 'number')
    return Promise.reject(new AxiomError.Invalid('offset', arg.offset));

  // If there's a count, it must be a number.
  if ('count' in arg && typeof arg.count != 'number')
    return Promise.reject(new AxiomError.Invalid('count', arg.count));

  // If there's a whence, it's got to match this regexp.
  if ('whence' in arg && !/^(begin|current|end)$/.test(arg.whence))
    return Promise.reject(new AxiomError.Invalid('whence', arg.whence));

  // If there's a whence, there's got to be an offset.
  if (arg.whence && !('offset' in arg))
    return Promise.reject(new AxiomError.Missing('offset', arg.whence));

  // If there's an offset, there's got to be a whence.
  if (('offset' in arg) && !arg.whence)
    return Promise.reject(new AxiomError.Missing('whence', arg.whence));

  // If there's a dataType, it's got to be valid.
  if ('dataType' in arg && OpenContext.dataTypes.indexOf(arg.dataType) == -1)
    return Promise.reject(new AxiomError.Invalid('dataType', arg.dataType));

  return Promise.resolve();
};

/**
 * Open a file.
 *
 * This can only be called once per OpenContext instance.
 *
 * This function attempts to open a path.  If the open succeeds, the onReady
 * event of this binding will fire, and will include the 'stat' value for the
 * target file.  From there you can call the OpenContext seek, read, and write
 * methods to operate on the target.  When you're finished, call closeOk,
 * closeError, or closeErrorValue to clean up the context.
 *
 * If the open fails, the onClose event of this binding will fire and will
 * include an error value.
 */
OpenContext.prototype.open_ = function() {
  this.assertReadyState('WAIT');

  if (this.didOpen_) {
    return Promise.reject(new AxiomError.Runtime(
        'OpenContext..open called multiple times'));
  }

  this.didOpen_ = true;

  return Promise.resolve();
};

/**
 * Seek to a new position in the file.
 *
 * The arg object should be an object with the following properties:
 *
 *  arg {
 *    offset: 0, An integer position to seek to.
 *    whence: ('begin', 'current', 'end'), A string specifying the origin of
 *      the seek.
 *  }
 *
 * @param {Object} arg The seek arg.
 * @return {Promise}
 */
OpenContext.prototype.seek_ = function(arg) {
  return this.checkArg_(arg);
};

/**
 * Read from the file.
 *
 * The arg object should be an object with the following properties:
 *
 *  arg {
 *    offset: 0, An integer position to seek to before reading.
 *    whence: ('begin', 'current', 'end'), A string specifying the origin of
 *      the seek.
 *    dataType: The data type you would prefer to receive.  Mus be one of
 *      OpenContext.dataTypes.  If the target cannot provide the requested
 *      format it should fail the read.  If you leave this unspecified the
 *      target will choose a dataType.
 *  }
 *
 * @param {Object} arg The read arg.
 */
OpenContext.prototype.read = function(arg) {
  if (!this.mode.read) {
    return Promise.reject(new AxiomError.TypeMismatch(
        'mode.read', this.pathSpec));
  }

  return this.checkArg_(arg);
};

/**
 * Write to a file.
 *
 * The arg object should be an object with the following properties:
 *
 *  arg {
 *    offset: 0, An integer position to seek to before writing.
 *    whence: ('begin', 'current', 'end'), A string specifying the origin of
 *      the seek.
 *    data: The data you want to write.
 *    dataType: The type of data you're providing.  Must be one of
 *      OpenContext.dataTypes.  If the 'data' argument is an instance of a
 *      Blob or ArrayBuffer instance, this argument has no effect.
 *  }
 *
 * @param {Object} arg The write arg.
 */
OpenContext.prototype.write = function(arg) {
  if (!this.mode.write) {
    return Promise.reject(new AxiomError.TypeMismatch(
        'mode.write', this.pathSpec));
  }

  return this.checkArg_(arg);
};
