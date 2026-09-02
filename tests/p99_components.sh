#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACTION_UC="$ROOT_DIR/p99/files/usr/lib/components/action.uc"
UPDATES_TS="$ROOT_DIR/fe-app-p99/src/p99/tabs/updates/initController.ts"
DIAGNOSTICS_TS="$ROOT_DIR/fe-app-p99/src/p99/tabs/diagnostic/initController.ts"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

grep -Fq '/p99/sing-box-extended/latest.json' "$ACTION_UC" ||
  fail "sing-box Extended metadata must come from the P99 mirror"
if grep -A12 'function resolve_sing_box_extended_release' "$ACTION_UC" |
  grep -Fq 'fetch_github'; then
  fail "sing-box Extended resolver must not fall back to GitHub"
fi

grep -Fq "text: 'Tiny'" "$UPDATES_TS" || fail "Tiny switch is missing"
grep -Fq "text: 'Extended'" "$UPDATES_TS" || fail "Extended switch is missing"
if grep -Fq "text: 'Stable'" "$UPDATES_TS"; then
  fail "Stable sing-box must not be offered in LuCI"
fi
if grep -Fq "text: 'Extended compressed'" "$UPDATES_TS"; then
  fail "Extended compressed must not be offered in LuCI"
fi

grep -Fq "title: 'Zapret-Manager-Stressozz'" "$UPDATES_TS" ||
  fail "Zapret-Manager-Stressozz branding is missing"
grep -Fq 'zapret_manager_installed' "$UPDATES_TS" ||
  fail "Zapret-Manager installed-state check is missing"
grep -Fq "key: 'zapretManagerRemove'" "$UPDATES_TS" ||
  fail "Zapret-Manager remove button is missing"
grep -Fq 'function remove_zapret_manager(action)' "$ACTION_UC" ||
  fail "Zapret-Manager safe removal action is missing"
grep -Fq 'clear_version_caches();' "$ACTION_UC" ||
  fail "component installation must invalidate system-info caches"
if grep -Fq 'github_probe(proxy_address)' "$ROOT_DIR/p99/files/usr/lib/components/updates.uc"; then
  fail "list updates must not wait for an unrelated GitHub availability probe"
fi
grep -Fq 'grid-template-columns: repeat(2, minmax(0, 1fr))' \
  "$ROOT_DIR/fe-app-p99/src/p99/tabs/updates/styles.ts" ||
  fail "component columns must have equal fixed widths"
grep -Fq "key: 'P99 X'" "$DIAGNOSTICS_TS" ||
  fail "P99 X diagnostics branding is missing"

printf 'P99 X component checks passed\n'
