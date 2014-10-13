# Axiom library.

This is repo a work-in-progress.  See [HACK.md](HACK.md) for information on the development set up.

## Axiom Core

The Axiom core introduces the concepts of a `Module`, a `Service`, and an `Extension`.

A `Module` is the basic unit of thing-that-can-be-loaded.  Modules can be compiled in or runtime-loadable via HTML imports (Eventually).  The have identifiers and versions, and can specify dependencies on other modules.  They are tracked by a `ModuleManager`.

A `Module` can optionally contribute one or more named services.  A service is an arbitrary object associated with a pre-shared identifier.  For example, a module could contribute a "commands" service, which is where other modules would go to register new commands or to dispatch existing commands.

```js
import ModuleManager from '/axiom/core/module_manager';

// CommandManager is for illustration only, it doesn't exist yet.
import CommandManager from '/axiom/services/command_manager';
var commandManager = new CommandManager();

var mm = new ModuleManager();
mm.define(
  { id: 'axiom-services',
    version: '1.0.0',
    // The list of services we intend to define.
    'services': ['commands', ...]
  }).then(
  function(module) {
    module.bindService('commands',
      { get: function() {
          return Promise.resolve(commandManager)
        },
        extend: function(extension) {
          // "extension" is an instance of 'axiom/core/extension'.
          // The CommandManager interprets extension.descriptor as it sees fit
          // and returns a promise to indicate success or failure.
          return commandManager.extend(extension);
        }
      })
  });
```

Services can be "extended" by other modules.  An extension is an arbitrary configuration object associated with a source module and registered with a target service.  The configuration object can be provided statically, before the source module is actually loaded.  The Axiom library treats the configuration object as opaque data whose interpretation is defined by the target service.

To continue the previous example, extending the 'commands' service to include a quit command might look like this...

```js

var callCommand = function(name, arg) {
  if (name === 'quit')
    quit(arg);
};

mm.defineModule(
  { id: 'my-axiom-app',
    version: '1.0.0',
    'dependencies': 'axiom^1.0.0'
    'extends': {
      'commands': {
        'define-commands': {
          'quit': {}
        }
      }
    }
  }).then(
  function(module) {
    module.bindExtension('commands', {'call': callCommand});
  });
```

Modules can be disabled/enabled, and said state propagates to services and extensions provided by the module.

## Axiom Services

Rough swing at the default services...

* The "commands" service.  Instance of a CommandManager, which is a registry of things that can be done and a dispatch() method to do them.
* The "preferences" service.  Instance of a Preference Manager, which is a registry of setting {name: (type, default-value, current-value).  Options for cloud synced and machine local storage.  Import/export as flat file.  Each entry is scoped to the Module that defined it.
* The "views" service.  Instance of a ViewManager, which is a registry of top level and dependent views and methods to show/hide/move them.
* The "windows" service.  Window Manager, controller of active windows and the views they contain.  Includes create/destroy/save/restore methods.
* The "filesystem" service.  A virtual filesystem API which can front for a number of persistent filesystem implementations.
