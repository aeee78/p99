#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULESETS_UC="$ROOT_DIR/p99/files/usr/lib/singbox/rulesets.uc"
P99_LIB="$ROOT_DIR/p99/files/usr/lib"
CONSTANTS_UC="$P99_LIB/core/constants.uc"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_eq() {
  local expected="$1"
  local actual="$2"
  local label="$3"

  [ "$actual" = "$expected" ] || fail "$label: expected '$expected', got '$actual'"
}

assert_eq srs \
  "$(ucode -L "$P99_LIB" "$RULESETS_UC" file-extension 'https://example.com/path/rule.srs?token=1#x')" \
  "ruleset file extension"
ucode -L "$P99_LIB" "$RULESETS_UC" is-community youtube >/dev/null ||
  fail "youtube should be a community ruleset"
if ucode -L "$P99_LIB" "$RULESETS_UC" is-community unknown_service >/dev/null 2>&1; then
  fail "unknown service should not be a community ruleset"
fi
assert_eq domains \
  "$(ucode -L "$P99_LIB" "$RULESETS_UC" kind-from-reference-hint 'https://example.com/geosite-custom.srs')" \
  "domain ruleset hint"
assert_eq subnets \
  "$(ucode -L "$P99_LIB" "$RULESETS_UC" kind-from-reference-hint '/tmp/geoip-cidr.json')" \
  "subnet ruleset hint"
assert_eq subnets \
  "$(ucode -L "$P99_LIB" "$RULESETS_UC" kind-from-reference-hint 'https://raw.githubusercontent.com/Greeg0ry/b4geoip-p99/main/srs/valve.srs')" \
  "b4geoip ruleset hint"
assert_eq unknown \
  "$(ucode -L "$P99_LIB" "$RULESETS_UC" kind-from-reference-hint '/tmp/custom.srs')" \
  "unknown ruleset hint"
assert_eq source \
  "$(ucode -L "$P99_LIB" "$RULESETS_UC" remote-format 'https://example.com/rules.json')" \
  "json remote ruleset format"
assert_eq binary \
  "$(ucode -L "$P99_LIB" "$RULESETS_UC" remote-format 'https://example.com/rules.srs')" \
  "srs remote ruleset format"
assert_eq binary \
  "$(ucode -L "$P99_LIB" "$RULESETS_UC" remote-format 'https://example.com/rules.unknown')" \
  "unknown remote ruleset format"
assert_eq 'http://mirror.example/p99/lists/rulesets/community/youtube.srs' \
  "$(SRS_MAIN_URL='http://mirror.example/p99/lists/rulesets/community' ucode -L "$P99_LIB" "$RULESETS_UC" community-url youtube)" \
  "mirrored community ruleset URL"
assert_eq 'http://mirror.example/p99/lists/rulesets/github.srs' \
  "$(SRS_GITHUB_URL='http://mirror.example/p99/lists/rulesets/github.srs' ucode -L "$P99_LIB" "$RULESETS_UC" community-url github)" \
  "mirrored GitHub ruleset URL"
assert_eq 'https://github.com/itdoginfo/allow-domains/releases/latest/download' \
  "$(P99_MIRROR_BASE_URL='http://mirror.example' ucode -L "$P99_LIB" "$CONSTANTS_UC" get SRS_FALLBACK_MAIN_URL)" \
  "community ruleset fallback URL"
assert_eq 'https://github.com/zxc-rv/ad-filter/releases/latest/download/adlist.srs' \
  "$(P99_MIRROR_BASE_URL='http://mirror.example' ucode -L "$P99_LIB" "$CONSTANTS_UC" get SRS_FALLBACK_ADS_HAGEZI_PRO_URL)" \
  "adblock ruleset fallback URL"

ucode -L "$P99_LIB" -e 'let rulesets = require("singbox.rulesets"); if (rulesets.kind_from_reference_hint("geoip") != "subnets") exit(1);'

printf 'singbox rulesets checks passed\n'
