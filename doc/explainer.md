# Axiom: Universal File System, Streams, and Processes API for JS

Axiom is a cross browser library that provides primitives for File Systems, Streams, and Processes.

Axiom is not a "framework" or a "toolkit".  You do not have to redesign your application to use Axiom.  Axiom doesn't mind if you're already using other JavaScript libraries.  Axiom's main goal in life is to a buffer between your application and stuff that fits into its file system view of the world.

## File Systems on the web

If you want to work with files on the web you've got a number of options.  You can roll your your own Indexed DB based file system or use Chrome's DOM File System to store thing on the client side.  If you need cloud based storage you might integrate with Google Drive, OneDrive, DropBox, Box.net, or others.

If you've got more specialized needs, you might cook up your own way of talking to a node.js server or write a native app that embeds a browser in order to talk directly to the local machine.

The situation without Axiom can be crudely summarized with this diagram:

[Diagram of File System access without Axiom](fs-without-axiom.png)

The cross-browser portion of your app lives in the browser, and you come up with a scheme to get a the relevant file system data.  Each back end is a little different though, so you'll probably choose something that seems right at the time.  If your needs change, you'll have to do some refactoring later.

If you end up writing your own server or custom browser embedding, you'll need a file system API (and tests) to go along with it.

Axiom adds a normalization layer to this story...

[Diagram of File System access with Axiom](fs-with-axiom.png)

Here, your client application always conducts file system access via to the Axiom API.  File System drivers, provided by third parties, or by yourself, handle the access to and from the underlying store.  If you have special needs you can implement your own messaging transport, and leverage the Axiom API and streaming file systems for the rest.

## Processes and Streams

The Axiom file system API also covers processes and streams.

Process support means that clients can invoke any path that is marked as executable.  When this happens, a callback registered when the file was created will be invoked.  The callback will receive arguments provided by the caller, along with stdin, stdout, and stderr streams and an event stream for out-of-band signaling.  The callback can execute asynchronously, and exit with an 'ok' or 'error' disposition and a result value.

