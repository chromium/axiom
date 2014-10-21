# Axiom library.

This is repo a work-in-progress.  See [HACK.md](HACK.md) for information on the development set up.

## Axiom Core

The Axiom core introduces the concepts of a `Module`, a `Service`, and an `Extension`.

A `Module` is the basic unit of thing-that-can-be-loaded.  Modules can be compiled in or runtime-loadable via HTML imports.  The have identifiers and versions, and can specify dependencies on other modules.

A `Service` is an object provided by a Module.  For example, the "commands" service, provided by the base Axiom module, contains a registry of commands that can be dispatched within an application.

An `Extension` is an object applied to another module's Service.  The [axiom_shell](https://github.com/rginda/axiom_shell) module provided an extension to the "commands" service which defines the commands available in the Axiom Shell application.

Each module has an associated module descriptor which specifies the services and extenstion contained within the module.  Service descriptors specify the service's interface (methods and events), a schema for the service's extension descriptor, and an interface for extension implementations.  See the [base descriptor](lib/axiom/descriptor.js) for an example.

## Bindings

Modules, Services, and Extensions can all be described separate from their implementations.  Because of this, the [Module](lib/axiom/core/module.js), [Service](lib/axiom/core/service.js), and [Extension](lib/axiom/core/extension.js) objects are a representation of the descriptor and the actions that can be performed using only the descriptor.  You cannot use one of these objects to directly call the implementation behind a Module, Service, or Extension.  For that the module associated with the object must be loaded, and the module must associate some "real" object with the Axiom Module, Service, or Extension object.

This is done with objects called `Bindings` (see [lib/axiom/bindings/](./lib/axiom/bindings/)).  Bindings are simple JS objects that represent a connection between two bits of code.  When a binding is defined it can include a number of "unbound methods".  Attaching to a binding is a proces of connecting an implementation to each of these unbound methods and marking the binding as "ready".  (NOTE: Bindings sometimes use events in place of methods, when it's possible that more than one recipient may care about a notification.)

Holders of a Binding object must ensure that the binding is ready before they call any unbound methods or raise any events.  There's a simple `whenReady` method that can be used for this purpose.  `whenReady` returns a `Promise` that resolves when the binding is ready or rejects if the binding fails to become ready.

```js
var serviceBinding = serviceManager.getServiceBinding('commands');
serviceBinding.whenReady().then(function() {
  serviceBinding.dispatch('foo', null);
});
```

The `whenReady` method works for modules that you know are loaded by default.  If you expect that the module may not yet be loaded, use `whenLoadedAndReady` instead.

```js
var serviceBinding = serviceManager.getServiceBinding('usb-api');
serviceBinding.whenLoadedAndReady().then(function() {
  serviceBinding.open(...);
});
```

## Binding lifetime

Bindings have a lifetime defined by their `readyState` property.  A binding is created in the `'WAIT'` state.  It remains in that state until someone explicitly calls the `ready(value)` method to mark the binding as ready for use.  Some bindings may become invalid, if the underlying implementation is unloaded, or some transient connection to it is lost.  In this case, the binding should be closed with `closeOk(value)` or `closeError(value)`.

The values provided to `ready`, `closeOk` and `closeError` are remembered on the binding, and provided to the binding's onReady and onClose events.  The ok/error disposition of the close is also remembered on the binding.

If an error happens while making the binding ready the `closeError` method should be called, and the binding will transition to the `'ERROR'` state.

It's up to the individual binding and its clients to decide whether or not a binding can successfully transition back to '`READY'` after a `'CLOSE'` or `'ERROR'`.  These "restartable" bindings may need special treatment by client code to cope with the fact that onReady and onClose may fire more than once.

## Axiom Services

Rough swing at the default services...

* The "commands" service.  Instance of a CommandManager, which is a registry of things that can be done and a dispatch() method to do them.
* The "preferences" service.  Instance of a Preference Manager, which is a registry of setting {name: (type, default-value, current-value).  Options for cloud synced and machine local storage.  Import/export as flat file.  Each entry is scoped to the Module that defined it.
* The "views" service.  Instance of a ViewManager, which is a registry of top level and dependent views and methods to show/hide/move them.
* The "windows" service.  Window Manager, controller of active windows and the views they contain.  Includes create/destroy/save/restore methods.
* The "filesystem" service.  A virtual filesystem API which can front for a number of persistent filesystem implementations.
