#!/usr/bin/env ucode

// Keep this worker outside sing-box.  procd can respawn a crashed sing-box,
// but an explicit stop or a permanently failing runtime otherwise leaves
// dnsmasq forwarding to an unavailable local DNS listener indefinitely.
let fs = require("fs");
let uci = require("core.uci");

const LIB_DIR = getenv("P99_LIB") || "/usr/lib/p99";
const BIN_PATH = getenv("P99_BIN") || "/usr/bin/p99";
const CONFIG_NAME = getenv("P99_CONFIG_NAME") || "p99";
const STATE_UC = LIB_DIR + "/service/state.uc";
const RELOAD_LOCK_DIR = getenv("P99_RELOAD_LOCK_DIR") || "/var/run/p99.reload.lock";
const INTERVAL_SECONDS = int(getenv("P99_WATCHDOG_INTERVAL_SECONDS") || "5");
const GRACE_SECONDS = int(getenv("P99_WATCHDOG_GRACE_SECONDS") || "90");
const FAILURE_SECONDS = int(getenv("P99_WATCHDOG_FAILURE_SECONDS") || "60");

function quote(value) {
    return "'" + replace(value == null ? "" : "" + value, /'/g, "'\\''") + "'";
}

function status(args) {
    let command = [ "ucode", "-L", LIB_DIR, STATE_UC ];
    for (let arg in args)
        push(command, quote(arg));
    return system(join(" ", command) + " >/dev/null 2>&1") == 0;
}

function active() {
    return uci.get(CONFIG_NAME + ".settings.shutdown_correctly") == "0";
}

function transitioning() {
    return fs.stat(RELOAD_LOCK_DIR) != null;
}

function singbox_healthy() {
    // This verifies the exact procd-owned runtime rather than accepting an
    // unrelated sing-box process with the same executable name.
    return status([ "sing-box-single-owned-service-runtime" ]);
}

function log(message, level) {
    system("logger -t p99 " + quote("[" + level + "] " + message) + " >/dev/null 2>&1");
}

function sleep_seconds(seconds) {
    system("sleep " + quote("" + seconds));
}

function main() {
    let started = int(clock()[0]);
    let failed_since = 0;

    while (true) {
        let now = int(clock()[0]);

        // P99 is intentionally stopped, or its own lifecycle currently
        // owns a transition.  Neither case is an outage for this watchdog.
        if (!active() || transitioning() || now - started < GRACE_SECONDS) {
            failed_since = 0;
        }
        else if (singbox_healthy()) {
            failed_since = 0;
        }
        else {
            if (failed_since == 0) {
                failed_since = now;
                log("sing-box became unavailable; waiting " + FAILURE_SECONDS + " seconds before DNS rollback", "warn");
            }
            else if (now - failed_since >= FAILURE_SECONDS) {
                log("sing-box remained unavailable; stopping P99 and restoring dnsmasq DNS", "fatal");
                system(quote(BIN_PATH) + " stop >/dev/null 2>&1");
                failed_since = 0;
            }
        }

        sleep_seconds(INTERVAL_SECONDS > 0 ? INTERVAL_SECONDS : 5);
    }
}

main();
