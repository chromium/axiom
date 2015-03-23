# Building Axiom

First you'll need to settle few prerequisites.

## node.js and npm

Axiom uses a grunt based build, so you'll need [node.js](https://nodejs.org/) to get started.   I recommend the single-user home-directory based node install, but you're free to install it your own way.

The home directory installation goes like this:

Visit [http://nodejs.org/download/](http://nodejs.org/download/) and download the latest version of the node.js source.  Untar the source, configure and build...

```sh
$ cd ~/path/to/nodejs/source/
$ ./configure --path=~/opt/
$ make install
```

Make sure to modify your PATH to include `~/opt/bin`.  You can check that node and npm are properly installed by running `npm --version`.

## grunt

After setting up node.js and cloning the Axiom repository, you'll want to make sure you have grunt-cli installed...

```
# install the grunt cli interface globally, if you haven't already.
$ npm install -g grunt-cli
```

## Axiom npm dependencies

Now install Axiom dependencies.  You'll need this step the first time you build Axiom, and any time a new dependency is added.

```
$ cd /path/to/axiom/
$ npm install
```

## Build one-or-more Axiom grunt targets

Axiom is written as a series of ECMAScript 6 modules.  It needs to be transpiled into browser or node.js compatible modules before it can be used.  We use [es6-module-transpiler](https://github.com/esnext/es6-module-transpiler) for this.

```
# Create ready-to-use Axiom distribution
$ grunt dist
```

We also use the [closure compiler](https://developers.google.com/closure/compiler/) for static analysis.  It's possible to skip the static analysis step if you don't want to install closure, but not if you plan to submit a pull request.

To perform a static analysis you'll need to get a recent version of closure from github and point your CLOSURE_PATH environment variable to it.  Then run one of the grunt targets that includes a closure pass.

```
# Just static analysis
$ grunt check
```

Our tests are written in [Jasmine](http://jasmine.github.io/2.2/introduction.html).  We have a build target that creates a stand-alone test_harness.html file which you can load in your browser and debug just like any other web page.

You'll need to serve the test harness yourself, see below.

```
# Build the test harness, then rebuild it after changes.
$ grunt test-watch
# Same as above, but add closure.
$ grunt check-test-watch
```

We also use [Karma](http://karma-runner.github.io/0.12/index.html) for automated test runs.

```
# Run automated tests in PhantomJS.
$ grunt test
# Run automated tests in Chrome.
$ grunt --browsers=Chrome test
# Both...
$ grunt --browsers=Chrome,PhantomJS test
```

Our web_shell is build as a sample app, and as such isn't included as part of the main distribution.

```
# Build the samples once...
$ grunt samples
# Or build once, then watch for changes and rebuild...
$ grunt watch:samples
```

You'll need to serve the sample app somehow, see below.

## http-server

The test harness and sample apps need to be served from somewhere.  One simple way is to use the [http-server](https://www.npmjs.com/package/http-server) package.

Our code assumes you're serving it from https, so step one is to generate a key and certificate for your development server.  If you have openssl installed, it goes like this...

```
$ openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout \
  ~/ssh/dev_server_key.pem -out ~/.ssh/dev_server_cert.pem
```

Then you'll install the http-server package if you don't already have it...

```
$ npm install -g http-server
```

Finally, start the server with...

```
http-server -p8080 -S -C ~/.ssh/dev_server_cert.pem -K ~/.ssh/dev_server_key.pem
```

Note that our Google Drive file system driver assumes your dev server is running on port 8080.  If you're not interested in this code you can run from any port.

A typical use case is to keep this server running in one terminal window in conjunction with `grunt watch:samples` or `grunt check-test-watch` running in another terminal window.  Make changes to the Axiom source, wait for the grunt rebuild to finish, and then reload the app in your browser.
