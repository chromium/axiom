# Axiom Shell

An initial client of the Axiom library.

You'll want to set up an `npm link` to the Axiom library before building this.  This goes like this...

```sh
$ cd /path/to/axiom
$ npm link  # This symlinks the axiom directory into your global node_modules.
$ cd /path/to/axiom-shell
$ # This links from global node_modules/axiom to the local one.
$ npm link axiom
```

Now you can build using `grunt reload_chrome_app`, which will build axiom-shell as a chrome app in `/out/chrome_app` and launch chrome in a new profile (if it's not already running) and reload the Axiom shell app.
