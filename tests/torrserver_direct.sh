#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIRECT_UC="$ROOT_DIR/p99/files/usr/lib/torrserver/direct.uc"
INIT_SCRIPT="$ROOT_DIR/p99/files/etc/init.d/p99-torrserver-direct"

fail() {
  printf 'FAIL: %s
' "$1" >&2
  exit 1
}

[ -f "$DIRECT_UC" ] || fail "direct.uc missing"
[ -f "$INIT_SCRIPT" ] || fail "init script missing"

# Check syntax
ucode -c "$DIRECT_UC" -o /dev/null || fail "direct.uc syntax error"

# Check status command runs and produces valid json
status_json="$(ucode -L "$ROOT_DIR/p99/files/usr/lib" "$DIRECT_UC" status)"
printf '%s
' "$status_json" | grep -Fq '"running":' || fail "status output missing running field"
printf '%s
' "$status_json" | grep -Fq '"available":' || fail "status output missing available field"
printf '%s
' "$status_json" | grep -Fq '"enabled":' || fail "status output missing enabled field"
printf '%s
' "$status_json" | grep -Fq '"active":' || fail "status output missing active field"

# Test rule-output-active check
sample_nft_output='table inet P99TorrServerDirect {
	chain output {
		type route hook output priority -151; policy accept;
		socket cgroupv2 level 2 "torrserver/service" meta mark set 0x08000000 counter packets 10 bytes 800 comment "P99 TorrServer Direct"
	}
}'

if ! printf '%s
' "$sample_nft_output" | ucode -L "$ROOT_DIR/p99/files/usr/lib" "$DIRECT_UC" rule-output-active "/torrserver/service/worker"; then
  fail "rule-output-active must recognize valid active nft rule"
fi

bad_nft_output='table inet P99TorrServerDirect {
	chain output {
		type route hook output priority -151; policy accept;
	}
}'

if printf '%s
' "$bad_nft_output" | ucode -L "$ROOT_DIR/p99/files/usr/lib" "$DIRECT_UC" rule-output-active "/torrserver/service/worker"; then
  fail "rule-output-active must fail on missing rule"
fi

printf 'TorrServer Direct checks passed
'
