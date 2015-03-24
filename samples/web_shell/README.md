# About the Axiom web_shell sample

The Axiom web_shell is an extensible command-line shell environment that runs in a browser as a normal web page.  It works in Chrome and Firefox and is live on our github.io page, here: [https://chromium.github.io/axiom/web_shell/](https://chromium.github.io/axiom/web_shell/).

![Screenshot](images/screenshot-20150324.png)


## Self guided tour

When you load wash you're presented with a welcome message and command prompt that should look something like this:

```
jsfs:/> _
```

This is wash, the "Web Application Shell", telling you it's ready for your command.

Wash is similar to other command shells you may already be used to, such as bash or cmd.exe.  You type a command, and the wash will try to match it to an executable.  If one is found, it's started along with whatever arguments you provide.  If not, you'll get an error message.

### Commands and arguments

Let's poke around a little using the `echo` command.  Echo takes whatever argument you give and prints it to the terminal.  Try with a simple string argument:

```
jsfs:/> echo "hello world"
hello world
jsfs:/> _
```

Command arguments in wash can be expressed as JSON values too.  You can pass Objects, Arrays, or Strings, or any combination of them:

```
jsfs:/> echo [1,2,3]
[
  "1",
  "2",
  "3"
]
jsfs:/> echo {a: 1, b: 2}
{
  "a": "1",
  "b": "2"
}
jsfs:/> echo [one, {a: 1, b: 2}]
[
  "one",
  {
    "a": "1",
    "b": "2"
  }
]
jsfs:/> _
```

Notice that the parser is pretty relaxed about what constitutes valid JSON.  String don't need to be quoted anywhere.  This is nice for a shell environment, but if you need to be more precise you're free to put quotes where you need them:

```
jsfs:/> echo ["1", ",", 2, ",", 3]
[
  "1",
  ",",
  "2",
  ",",
  "3"
]
jsfs:/> _
```

Wash also treats single and double quotes slightly differently, as you may already expect:

```
jsfs:/> echo ["\x21", '\x21']
[
  "!",
  "\\x21"
]
jsfs:/> _
```

The echo command also takes some named arguments.  You can modify the whitespace used to print JSON values with the `--space` argument:

```
jsfs:/> echo -s'' {a: 1, b: 2}
{"a":"1","b":"2"}
jsfs:/> _
```

### Return values

Commands also have return values.  The shell will print a command's return value to the terminal if it is not null, undefined, or an integer.  You can try it with the `readline` command.  Readline reads a line of input from the user and returns it to the caller.

```
jsfs:/> readline -p "ok? "
ok? yes
"yes"
jsfs:/> _
```

The `wash` command actually uses `readline` under the hood.  Return values are especially useful when calling executables programmatically.

### Exploring the file system

Now let's look around the file system a little.

Try `mount` to see a list of mounted file systems:

```
jsfs:/> mount
Mounted file systems:
jsfs:/    "js file system"
html5:/   "html5 file system (permanent)"
tmp:/     "html5 file system (temporary)"
jsfs:/> _
```

By default you should have three available file sytems.  The jsfs: file system resides in-memory.  It contains links to the built-in executables, and any new executables you install.  You can create new directories and files here but your changes will be lost when you reload the shell.  The html5:/ file system is persistent.  It's based on the DOM FileSystem or Indexed DB API, depending on which browser you're using.  The tmp:/ file system may or may not be persisted across page reloads, it's intended to be used for temporary files.

The executables are stored in `jsfs:/exe`.  You can use the `ls` command to see its contents:

```
jsfs:/> ls jsfs:/exe
Listing of "jsfs:/exe", 16 entries:
cat             signature: {"help|h":"?","_":"@"}
clear           signature: {"help|h":"?"}
cp              signature: {"help|h":"?","_":"@"}
echo            signature: {"_":"@","help|h":"?","pluck|p":"?","space|s":"$"}
import          signature: {"help|h":"?","_":"@"}
ls              signature: {"help|h":"?","_":"@"}
mkdir           signature: {"help|h":"?","_":"@"}
mount           signature: {"help|h":"?","type|t":"$","name|n":"$"}
mount.gdrive    signature: {"help|h":"?","name|n":"$"}
mv              signature: {"help|h":"?","_":"@"}
pwd             signature: {"help|h":"?"}
readline        signature: {"help|h":"?","input-history|i":"@","prompt-string|p":"$"}
rm              signature: {"help|h":"?","_":"@"}
script          signature: {"help|h":"?","save|s":"?","_":"@"}
touch           signature: {"help|h":"?","_":"@"}
wash            signature: {"help|h":"?","welcome|w":"?"}
jsfs:/> _
```

Here you can see 16 commands that come pre-installed.  Along with each command is an object that describes the arguments it accepts.  The `"_"` argument stands in for the list of unnamed arguments.  Each argument name is paired with the expected type for the argument.  These are one-character stand ins for longer type names.  They are:

* `"$"` A String value, as in `echo -s " " [1,2,3]`.
* `"?"` A Boolean value.  The argument is present or not, or can be prefixed with "--no-" to turn it off.  As in `echo --help` or `echo --no-help "foo"`.
* `"@"` An Array value, as in `readline --input-history [1,2,3]`.
* `"%"` A Map, as in `echo {foo: 1}`.
* '"*"` Any type of value.  Wash will use the most appropriate parser based on the leading character.

Many of these commands are probably familiar to you from other environments.  Each command supports a "-h" argument which will cause it to print some help text and exit.

Try it with the script command:

```
jsfs:/> script -h
usage: script <url>
Load a new script from the network.

This will load an arbitrary script from the network and run it as
part of the web shell.  There are no security guarantees.  Please
be careful with this command, especially if you have the gdrive
file system mounted.

Please see http://goo.gl/DmDqct#script for more information about this
command.
jsfs:/> _
```

The script command is a quick-and-dirty way to extend the wash environment.  It takes a url to a JavaScript file as an argument and pokes it into the shell as a new &lt;script&gt; tag.  It can come from any other domain as long as it's served over https.  Make sure you trust any scripts you load, as they can do anything at all to your file system.  If you've ever mounted the gdrive file system, they'll have full access.  If you use any scripts that leave credentials lying around in cookies or on the window object, they'll have the potential to get to those too.

Given that, we have a few scripts that come with the sample shell, which are at least as trustworthy as the shell itself.  One is called "editor", you can load it with:

```
jsfs:/> script scripts/editor.js
jsfs:/> _
```

That script installed a new command called edit in `jsfs:/exe`.  You can double check this using `ls`:

```
jsfs:/> ls jsfs:/exe/edit
edit  signature: {"help|h":"?","_":"@"}
jsfs:/> _
```

This edit command is a tiny wrapper around the [ace](http://ace.c9.io/) editor.  You can use it to modify files in the wash file system.  Try:

```
jsfs:/> edit html5:/foo
jsfs:/> _
```

This will open a new window with ace and an empty file.  Type `hello world`, hit `Ctrl-S` to save, and switch back to the web shell tab and type:

```
jsfs:/> cat html5:/foo
hello world
jsfs:/> _
```

You can switch back to ace at any point to edit ans save again.

See the [script.md](doc/script.md) for information about how to write your own scripts.

Next up, if you have a Google account, is to try mounting Google Drive.

```
jsfs:/> mount.gdrive
jsfs:/> _
```

The first time you run this command you'll need to sign in and grant the web shell access to your drive data.  If you didn't see a popup window, check that it wasn't blocked.

Now you can use the ace editor to modify files in gdrive:

```
jsfs:/> mkdir gdrive:/demo
jsfs:/> edit gdrive:/demo/foo
# Add some text and save it
jsfs:/> cat gdrive:/demo/foo
# your text here
jsfs:/> _
```

That's it.  Note that the edit and cat commands had no specific knowledge of Google Drive or its API.  The Axiom "Driver" for Google Drive took care of converting Axiom File System calls into gdrive calls and back again.

### Builtin commands

There are a few commands you haven't seen yet because they're built directly in to wash.  These commands affect the state of the running instance of wash itself, so they can't be represented in a global file system.

The cd command can be used to change the current directory:

```
jsfs:/> cd exe
jsfs:/exe> cd ..
jsfs:>
```

The `env-set` command can be used to set one or more environment variables.  Environment variables must start with a "$", "@", or "%" character to indicate their type.  This ensures that code retrieving the value will always get the type it expects.

```
jsfs:/> env-set {'$FOO': 'bar'}
jsfs:/> env-set {'@FOO': [1,2,3]}
jsfs:/> env-set {'%FOO': {bar: 1}}
```

The `env-get` command will return one or more environment variables:

```
jsfs:/> env-get '$FOO' '@FOO' '%FOO'
{
  "$FOO": "bar",
  "@FOO": [
    "1",
    "2",
    "3"
  ],
  "%FOO": {
   "bar": "1"
  }
}
```

And finally, the `env-del` command deletes environment variables:
```
jsfs:/> env-del '$FOO' '@FOO' '%FOO'
jsfs:/> env-get
{
  "@PATH": [
    "jsfs:/exe"
  ],
  "$TERM": "xterm-256color",
  "$HOME": "html5:/",
  "$HISTFILE": "html5:/.wash_history",
  "$PWD": "jsfs:/"
}
```

### Remembering your settings

At the moment, Wash persists two kinds of data.  The first is your input history, which is stored in the `.wash_history` file in your `$HOME` directory.  By default this is `html5:/.wash_history`.  It's a JSON array of every command you've typed.  This is only written on exit, so you must remember to type `exit` or press `Ctrl-D` to exit wash.

Wash will also execute all commands found in the `.washrc` file in your home directory.  Some commands, like `script` know how to update this file.  So you can pass the `--save` option to `script` to re-load the script at the next startup.  For example:

```
# If you already have the edit command, delete it first or reload the shell
html5:/> rm jsfs:exe/edit
html5:/> script --save scripts/editor.js
html5:/> cat .washrc
[
 {
  "script": {
   "_": [
    "scripts/editor.js"
   ]
  }
 }
]
jsfs:/> _
```

### Extending the shell

Extending the shell is beyond the scope of this document.  For details on writing your own scripts, see the [script.md](doc/script.md) document.  For details on adding new file systems, it's best to look through the code.  Check out the `base`, `domfs`, `jsfs`, and `gdrive` folders in [https://github.com/chromium/axiom/tree/master/lib/axiom/fs](https://github.com/chromium/axiom/tree/master/lib/axiom/fs) for some examples.

