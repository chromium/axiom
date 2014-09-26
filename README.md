# Axiom loader library.

## Source Setup

The build requires [npm](https://github.com/npm/npm) and [grunt](http://gruntjs.com/).

Npm is the Node Package Manager.  It's the package manager for node.js, and is part of the standard node.js installation.  Node can be installed for all users (as root) or for a single user.  I recommend the single-user home-directory based node install, which goes like this:

   $ cd ~/tmp
   $ curl -L https://npmjs.org/install.sh
   $ npm_config_prefix=~/opt/ install.sh
   $ # Make sure `~/opt/bin` stays in your path.

You can check that node and npm are properly installed by running `npm --version`.

Next, install grunt with `npm install grunt`, check it with `grunt --version`.

## Build

Once that's working run `npm install` from within the directory containing this readme file.  That command will fetch the build and runtime dependencies and install them into `./node_modules`.  You'll need to run `npm install` each time an external dependency is added.

To build the axiom loader library type `grunt`.  That's it.

The build generates interim deliverables in `./out/`.  See `./gruntfile.js` for the details.

## Usage

There aren't any tests yet and this is just a library so there's no app to run.

The amd version of the library ends up in `./out/concat/axiom.amd.js`, and any external npm dependcies are in `./out/concat/axiom_npm_deps.js`.  If you're using the axiom loader library in an app that also has npm dependencies you'll probably want to generate your own deps.js file.  That's ok, just make sure to include our dependencies as specified in `./package.json`.

To use this library in node.js or another CommonJS Environment, use the files from `./out/cjs/`.
