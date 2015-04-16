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

import AxiomError from 'axiom/core/error';
import Completer from 'axiom/core/completer';
import Ephemeral from 'axiom/core/ephemeral';

import Termcap from 'wash/termcap';
import washUtil from 'wash/wash_util';

/** @typedef JsExecuteContext$$module$axiom$fs$js$execute_context */
var JsExecuteContext;

/** @typedef StatResult$$module$axiom$fs$stat_result */
var StatResult;

/**
 * @constructor
 * A partial clone of GNU jsEval.
 *
 * @param {JsExecuteContext} executeContext
 */
var Eval = function(executeContext) {
  this.executeContext = executeContext;

  /**
   * @private @type {Termcap}
   */
  this.tc_ = new Termcap();

  this.exit = false;

  this.promptString_ = executeContext.getArg('prompt-string', '');
  this.promptVars_ = null;

  this.inputHistory = [];
};

/**
 * @param {JsExecuteContext} cx
 * @return {void}
 */
export var main = function(cx) {

  cx.ready();

  var jsEval = new Eval(cx);

  // TODO(grv): implement input-history for eval command.
  jsEval.inputHistory = cx.getArg('input-history', []);

  jsEval.setPrompt();

  jsEval.readEvalPrintLoop().then(function(value) {
    cx.closeOk(value);
  }).catch(function(err) {
    cx.closeError(err);
  });
};

/**
 * Read-eval-print-loop.
 *
 * @return {Promise<*>} Resolves to the value of the final evaluation.
 */
Eval.prototype.readEvalPrintLoop = function() {
  return this.readEvalPrint('').then(
    function(value) {
      if (this.exit) {
        return Promise.resolve();
      }
      if (this.executeContext.isEphemeral('Ready'))
        return this.readEvalPrintLoop();

      return Promise.resolve(value);
    }.bind(this)
  ).catch(
    function(value) {
      return Promise.reject(value);
    }.bind(this)
  );
};

/**
 * Read a single line of input, eval it, print the result or an error.
 *
 * @return {Promise<*>} Resolves to result of the evaluation.
 */
Eval.prototype.readEvalPrint = function(inputString) {
  var input = inputString;
  var promptString = this.promptString_;

  if (inputString !== '') {
    promptString = '';
  }

  return this.read(promptString).then(
    function(result) {
      if (result === null || result === 'exit') {
          this.exit = true;
        return Promise.resolve();
      }

      if (typeof result != 'string') {
        return Promise.reject(new AxiomError.Runtime(
            'Unexpected type from readline: ' + (typeof result)));
      }

      input += result;
      return this.evaluate(input).then(
        function(value) {
          if (typeof value !== 'undefined' && value !== null) {
            this.executeContext.stdout.write(value + '\n');
          }
          return Promise.resolve(value);
        }.bind(this));
    }.bind(this)
  ).catch(
    function(error) {
      // We currently do not support multi line input in readline. This is a
      // proxy to find if the error is a syntax error in code or the user has
      // not finished typing. The error here checked is returned by the eval
      // javascript function.
      // TODO(grv): Do a better detection of syntax error vs incomplete code.
      if (error && error.message == 'Unexpected end of input') {
        return this.readEvalPrint(input);
      } else if (error) {
        this.executeContext.stdout.write('Error: ' + error.message + '\n');
      } else {
        this.executeContext.stdout.write(
          'Error in evaluating input:' + input + '\n');
      }

      return Promise.resolve();
    }.bind(this)
  );
};

/**
 * @param {string} promptString
 * @return {!Promise<*>}
 */
Eval.prototype.read = function(promptString) {
  return washUtil.findExecutable(this.executeContext, 'readline').then(
    function(result) {
      return this.executeContext.call(
          result.path,
          { 'prompt-string': promptString,
            'input-history': this.inputHistory
          });
    }.bind(this));
};

/**
 * @param {string} input
 * @return {Promise<*>}
 */
Eval.prototype.evaluate = function(input) {
  try {
    var value = eval(input);
    return Promise.resolve(value);
  } catch (err) {
    return Promise.reject(err);
  }
}

main.signature = {
  'input-history': '@',
  'prompt-string|p': '$'
};

/**
 * @return {void}
 */
Eval.prototype.setPrompt = function() {
  this.promptString_ = this.tc_.output(
      '%set-attr(FG_BOLD, FG_CYAN) eval>  %set-attr()');
};

export default main;
