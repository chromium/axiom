Closure extern files under third_party/closure-compiler are instrumented by
the build/closure_externs script. The top level moduleName is replaced by
t_node_moduleName. Since all the closure modules are loaded globally this
avoids collision of the moduleNames, which can be defined elsewhere.

The instrumented files are generated whenever closure is run and written
under thired_party/decideIO.
