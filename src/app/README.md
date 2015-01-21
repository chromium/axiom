# Axiom Shell

An initial client of the Axiom library.

## Setting up the Axiom library  dependency

Normally, you'd use `npm install` to satisfy the dependency on axiom library, but we're not ready for that yet.  For now, use the `npm link` command to create a symbolic link from your axiom library repository into the axiom_shell directory.  This goes like this...

```sh
$ cd /path/to/axiom/core
$ npm link  # This symlinks the axiom directory into your global node_modules.
$ cd /path/to/axiom/app
$ # This links from global node_modules/axiom to the local node_modules/
$ # directory.
$ npm link axiom
```

Now you can build axiom_shell using `grunt reload_chrome_app`, which will build axiom-shell as a chrome app in `/out/chrome_app` and launch chrome in a new profile (if it's not already running) and reload the Axiom shell app.

But, since the axiom library is so new, you're probably making changes to the axiom library and axiom_shell at the same time.  You can build them them both in a single command line with...

```sh
$ cd /path/to/axiom/app
$ if ( cd node_modules/axiom; grunt dist ); then grunt reload_chrome_app; fi
```
