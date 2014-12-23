<!---

This document is formatted with Markdown. You're free to use any Markdown
generator you want, but here's what miket uses:

First-time setup

  - sudo npm install -g markdown-styles
  - pushd var/www/html && ln -s path/to/index.md && popd

Each build

  - pushd /var/www/html && generate-md --layout mixu-radar --input index.md --output gs/ && popd && chmod -R 755 /var/www/html/gs

-->

Getting Started with Axiom
===

**GOOGLE-CONFIDENTIAL** but we hope to open-source very soon!

By the end of this guide, you'll understand two things: what Axiom is, and how
to add something to it.

What is Axiom?
---

Axiom is a new way to build apps using web and Chrome technology. If you're a
fan of the Unix "do one thing and do it well" philosophy, you'll be right at
home with Axiom.

As of today, Axiom consists of just a few parts: a shell, a simple view manager
to provide windows, and a Native Client port of a few familiar programs. If you
get all the way to the end of this guide, then you will have written a simple
new module, and you'll understand how easy it is to extend Axiom. With a bit of
imagination and more Axiom modules, you'll be able to build all sorts of
interesting apps.

Goal #1: A brief tour of wash
---

The Axiom shell is called wash, or web app shell. In Chrome, visit
[https://goto.google.com/axiom-shell-demo]. You should see a horizontal blue
line that looks a little like a window title bar, and then below that, `wash$`,
which is the wash CLI prompt.

Note at this point that you've been redirected to x20, which as you know is a
corp static server. Everything you're seeing is static web content; all the
magic is happening client-side.

At the wash prompt, type `ls`. You'll see a directory listing. Explore a bit
with `ls axiom_shell` or `ls mnt/html5`. This should feel familiar if you've
ever navigated with a command-line shell. What you're seeing is some built-in
directories, the set of currently mounted filesystems including your x20
origin's HTML5 filesystem, and any imported modules. Right now the only
imported module is axiom_shell, which contains the shell you're running. It's
lonely! Let's fix that.

Type `import addon/pnacl`. After a short pause, you should have some new
modules available. Confirm by listing directories once again. Did you find
nethack? Run it with `nethack`. See you in an hour or two.

If you poked around after the `import` command, you will have noticed a new
directory in /addon/ that contained various pnacl-related files. Axiom
automatically searches /addon/*/exe/ for executables, which is why simply
typing `nethack` works, rather than having to type
`/addon/axiom_pnacl/exe/nethack`, which also would have worked.

Now let's get some work done! `nano /mnt/html5/hello.txt` should open nano, and
if you type something and save your work, it'll write the results to hello.txt.
If you prefer vim, go ahead and use that instead of nano. When you exit the
app, confirm it worked with `cat /mnt/html5/hello.txt`.

(Note that you can paste into wash with control-shift-v.) 

Goal #2: Write your first Axiom module
---

In this section, we're going to create a hello-world module hosted somewhere
else on the web. For simplicity, we'll put it in your x20 area, but it could be
anywhere your local machine can reach.

Go to [https://x20.corp.google.com/]. You'll be redirected to your personal
directory. In the www/axiom subdirectory, upload a file called index.html
containing the following:

    <x-axiom-plugin x-descriptor-module='my_module/descriptor'
		    x-main-module='my_module/main'>
    </x-axiom-plugin>

    <script>

    define('my_module/descriptor', ['exports'],
	   function(__exports__) {
	     __exports__['default'] = {
	       id: 'my_module',
	       version: '1.0.0',
	       extends: { 'filesystems@axiom': {} }
	     }
	   });

    define('my_module/main', ['exports', 'axiom/fs/js_file_system'],
	   function(__exports__, module_JsFileSystem) {
	     var JsFileSystem = module_JsFileSystem['default'];
	     __exports__['default'] = function(module) {
	       var myFileSystem = module.getExtensionBinding('filesystems@axiom');
	       var jsfs = new JsFileSystem(null, myFileSystem);
	       jsfs.rootDirectory.install({
		 'echo(*)': function(cx) {
		   cx.ready();
		   cx.stdout(JSON.stringify(cx.arg, null, ' ') + '\n');
		   return Promise.resolve(null);
		 }
	       });

	       return Promise.resolve(null);
	     }
	   });

    </script>

After a few seconds to let the file propagate in x20, you should be able to
visit the following URL:

[https://x20web.corp.google.com/~YOURLDAP/axiom/] (Replace YOURLDAP with your
own.)

Now switch back to wash. It's time to import your module:

`wash $ import https://x20web.corp.google.com/~YOURLDAP/axiom/`

Again, fix YOURLDAP. If this works correctly, you'll see `New module:
my_module`, which means you will have imported functionality from a remote
origin into Axiom. (As we said earlier, in this example it's technically the
same origin, but it could have been somewhere else if you'd used a different
webserver.)

Type `echo hello world`. Congratulations, your new Axiom module is live!

What's next?
---

  * Join our [discussion list](https://groups.google.com/a/google.com/forum/#!forum/chrome-axiom-discuss).

  * See the source for Axiom Core at
    [https://user.git.corp.google.com/rginda/axiom/]. In particular, the [Core
    README](https://user.git.corp.google.com/rginda/axiom/+/master/src/core/README.md)
    explains the basic Axiom concepts of Modules, Services, Extensions, and
    Bindings.

  * We don't recommend trying to develop on x20. It's not designed for rapid
    edit-refresh cycles, and the permissions system will make you unhappy. If
    you proceed past this guide, use your own static web server.
