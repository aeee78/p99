#!/usr/bin/env ucode

let lib = getenv("P99_LIB") || "/usr/lib/p99";
function quote(value) { return "'" + replace(value, /'/g, "'\''") + "'"; }
exit(system("sh " + quote(lib + "/full-uninstall.sh") + " start"));
