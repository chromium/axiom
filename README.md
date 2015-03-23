
# TODO

The axiom name is taken by a [Yoeman-like workflow tool](https://www.npmjs.com/package/axiom).  We'll need a new name, stat.


# Axiom: Universal File System, Streams, and Processes API for JS

Axiom is a cross browser library that provides primitives for File Systems, Streams, and Processes.

If you're not already familiar with Axiom, please read our [explainer document](doc/explainer.md) for a brief introduction to the project.

## Live demo

For a live demo of Axiom in action, check out the [web_shell sample app](https://chromium.github.io/axiom/web_shell/) on our github.io page.  Read more about it in [web_shell/README.md](https://github.com/chromium/axiom/tree/master/samples/web_shell/README.md).

## Building Axiom

If you're already familiar with node.js, npm, and grunt, you can jump right in with...

```
$ cd path/to/axiom
$ npm install
$ grunt dist
```

For more detailed information see our [build.md](doc/build.md) document.

## The Axiom distribution

The Axiom distribution includes two libraries, `axiom_base` and `axiom_wash`.

The `axiom-base` library contains the file system library and drivers for a few stock file systems, including:

* An in-memory file system called "jsfs".
* A [DOM File System](http://dev.w3.org/2009/dap/file-system/pub/FileSystem/) based driver called "domfs".  (Supported cross browser using [a polyfill](https://github.com/ebidel/idb.filesystem.js).
* A [Google Drive](https://developers.google.com/drive/v2/reference/) file system.

(The DOM and Google Drive file system drivers may move out to separate packages at some point.)

The `axiom-wash` library contains the "wash" executable and supporting executables.  If your app doesn't need to provide a command line interface you won't need to include this library.

These libraries provided as raw ES6 modules, individual AMD-compatible files, concatenated AMD-compatible bundle, and individual CommonJS modules.  Choose whichever version suits your particular application.

## Importing Axiom

If your application is browser based, you'll probably want to load the AMD bundle in a &lt;script&gt; tag.

If your app is already using an AMD loader then use your "require" function to import axiom modules, like `var FileSystem = require('axiom/fs/base/file_system').default';`.

If you don't have an AMD loader and don't want one, just call `__axiomExport__(window);` before calling any Axiom code.  This will create a window.axiom object which contains the Axiom modules.  For example, you can find the base FileSystem class at `axiom.fs.base.file_system.FileSystem`.  Alternatively, you can use __axiomRequire__ as outlined above.

If you're using Axiom in a node.js environment, make sure to include the cjs/ directory from the Axiom distribution in your module path, and remember to take the `default` export from the modules you require.  Something like `var FileSystem = require('axiom/fs/base/file_system').default;`.

## Axiom API

Documentation is a work-in progress.  Stay tuned to our [api.md](doc/api.md) document.  Until that's done, start with the [web_shell sample](samples/web_shell/) or the [base file system](lib/axiom/fs/base) classes.
