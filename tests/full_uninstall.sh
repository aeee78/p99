#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNINSTALL_SH="$ROOT_DIR/p99/files/usr/lib/full-uninstall.sh"
UNINSTALL_UC="$ROOT_DIR/p99/files/usr/lib/components/uninstall.uc"
P99_BIN="$ROOT_DIR/p99/files/usr/bin/p99"

fail() {
  printf 'FAIL: %s
' "$1" >&2
  exit 1
}

[ -f "$UNINSTALL_SH" ] || fail "full-uninstall.sh missing"
[ -f "$UNINSTALL_UC" ] || fail "uninstall.uc missing"

# Syntax check
sh -n "$UNINSTALL_SH" || fail "full-uninstall.sh shell syntax error"
ucode -c "$UNINSTALL_UC" || fail "uninstall.uc ucode syntax error"

# CLI entrypoint routing test
grep -Fq 'full_uninstall: [ "components/uninstall.uc", "start", 0 ]' "$P99_BIN" ||
  fail "full_uninstall routing missing from p99 entrypoint"

grep -Fq 'support_report: [ "diagnostics/runtime.uc", "support-report", 0 ]' "$P99_BIN" ||
  fail "support_report routing missing from p99 entrypoint"

# Test isolated full-uninstall execution with mock root
WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$WORK_DIR/etc/config" "$WORK_DIR/etc/init.d" "$WORK_DIR/usr/bin" "$WORK_DIR/usr/lib/p99"
mkdir -p "$WORK_DIR/etc/opkg" "$WORK_DIR/tmp" "$WORK_DIR/www" "$WORK_DIR/var/run/p99"
mkdir -p "$WORK_DIR/tmp/p99-full-uninstall.lock" "$WORK_DIR/var/run/p99/component-action.lock"

# Create dummy p99 files
touch "$WORK_DIR/etc/config/p99"
touch "$WORK_DIR/usr/bin/p99"
chmod +x "$WORK_DIR/usr/bin/p99"
cat >"$WORK_DIR/etc/opkg/distfeeds.conf" <<'EOF'
src/gz openwrt_core https://mirror.51343.ru/packages
EOF
cat >"$WORK_DIR/etc/opkg/distfeeds.conf.pre-p99-mirror" <<'EOF'
src/gz openwrt_core https://downloads.openwrt.org/packages
EOF

# Create dummy opkg command that reports success
cat >"$WORK_DIR/usr/bin/opkg" <<'EOF'
#!/bin/sh
exit 0
EOF
chmod +x "$WORK_DIR/usr/bin/opkg"

# Run full-uninstall directly using worker mode
PATH="$WORK_DIR/usr/bin:$PATH" P99_UNINSTALL_ROOT="$WORK_DIR" sh "$UNINSTALL_SH" worker "$WORK_DIR/tmp" "$WORK_DIR/www/status.json"

[ ! -f "$WORK_DIR/etc/config/p99" ] || fail "config should be removed"
[ ! -f "$WORK_DIR/usr/bin/p99" ] || fail "bin should be removed"
grep -Fq 'downloads.openwrt.org' "$WORK_DIR/etc/opkg/distfeeds.conf" || fail "repository should be restored"
grep -Fq '"state":"complete"' "$WORK_DIR/www/status.json" || fail "status should be complete"

printf 'Full uninstall checks passed
'
