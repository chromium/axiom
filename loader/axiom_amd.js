if (typeof define !== 'function' && typeof __axiomRequire__ !== 'function') {
  var define, __axiomRequire__, __axiomExport__;

  (function() {
    var registry = {}, seen = {};

    define = function(name, deps, callback) {
      registry[name] = { deps: deps, callback: callback };
    };

    __axiomRequire__ = function(name, opt_fromList) {
      if (seen[name]) { return seen[name]; }
      var fromList = opt_fromList || [];

      var mod = registry[name];

      if (!mod) {
        throw new Error("Module: '" + name +
                        "' not found, referenced from: " +
                        fromList[fromList.length - 1]);
      }

      var deps = mod.deps,
      callback = mod.callback,
      reified = [],
      exports;

      fromList.push(name);

      for (var i = 0, l = deps.length; i<l; i++) {
        if (deps[i] === 'exports') {
          reified.push(exports = {});
        } else {
          if (fromList.indexOf(deps[i]) != -1)
            throw new Error('Circular dependency: ' + name + ' -> ' + deps[i]);
          reified.push(__axiomRequire__(deps[i], fromList));
        }
      }

      fromList.pop(name);

      var value = callback.apply(this, reified);

      return seen[name] = exports || value;
    };

    function makeGlobals(global) {
      var createdModules = {};
      var root = global;

      function ensureModule(moduleName) {
        var current = root;
        var names = moduleName.split('/');
        // Ensure parent modules are created
        for (var i = 0; i < names.length; i++) {
          var childName = names[i];
          var child = current[childName];
          if (!child) {
            child = current[childName] = {};
          }
          current = child;
        }
        return current;
      }

      for (var name in registry) {
        var moduleGlobal = ensureModule(name);
        var exports = __axiomRequire__(name);
        for (var key in exports) {
          if (moduleGlobal.hasOwnProperty(key)) {
            throw new Error('Property "' + key + '" of module "' + name +
                            '" conflicts with submodule of same name.');
          }
          moduleGlobal[key] = exports[key];
        }
      }

      return root;
    }

    __axiomExport__ = function(opt_global) {
      if (!opt_global)
        opt_global = window;
      return makeGlobals(opt_global);
    };

    define.registry = registry;
    define.seen = seen;
  })();
}
