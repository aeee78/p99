#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
P99_FILES="$ROOT_DIR/p99/files"
P99_BIN="$P99_FILES/usr/bin/p99"
P99_LIB="$P99_FILES/usr/lib"
P99_INIT="$P99_FILES/etc/init.d/p99"

LIFECYCLE_UC="$P99_LIB/service/lifecycle.uc"
STATE_UC="$P99_LIB/service/state.uc"
PACKAGES_UC="$P99_LIB/core/packages.uc"
CONSTANTS_UC="$P99_LIB/core/constants.uc"
RULES_UC="$P99_LIB/providers/rules.uc"
SINGBOX_RUNTIME_UC="$P99_LIB/singbox/runtime.uc"
BYEDPI_RUNTIME_UC="$P99_LIB/providers/byedpi/runtime.uc"
ZAPRET_RUNTIME_UC="$P99_LIB/providers/zapret/runtime.uc"
ZAPRET2_RUNTIME_UC="$P99_LIB/providers/zapret2/runtime.uc"
ZAPRET2_CHECK_UC="$P99_LIB/providers/zapret2/check.uc"
ZAPRET2_VALIDATOR_UC="$P99_LIB/providers/zapret2/validator.uc"

WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

# 1. Verify absence of legacy shell modules
for legacy_file in \
  "$P99_LIB/byedpi.sh" \
  "$P99_LIB/constants.sh" \
  "$P99_LIB/helpers.sh" \
  "$P99_LIB/updater.sh" \
  "$P99_LIB/status_diagnostics.sh" \
  "$P99_LIB/config_validation.sh" \
  "$P99_LIB/runtime_state.sh" \
  "$P99_LIB/updates_runtime.sh" \
  "$P99_LIB/zapret.sh" \
  "$P99_LIB/zapret2.sh"
do
  [ ! -e "$legacy_file" ] || fail "legacy shell module must be removed: $legacy_file"
done

# 2. Verify p99 CLI entrypoint and lifecycle dispatch
grep -Fq '#!/usr/bin/ucode' "$P99_BIN" ||
  fail "p99 entrypoint must be a direct ucode executable"
grep -Fq 'service/lifecycle.uc' "$P99_BIN" ||
  fail "p99 must dispatch lifecycle orchestration through service/lifecycle.uc"

# 3. Core constants and package detection
config_name="$(ucode -L "$P99_LIB" "$CONSTANTS_UC" get P99_CONFIG_NAME)"
[ "$config_name" = "p99" ] ||
  fail "core/constants.uc get returned unexpected P99_CONFIG_NAME"

eval "$(ucode -L "$P99_LIB" "$CONSTANTS_UC" shell-env)"
[ "$P99_CONFIG" = "/etc/config/p99" ] ||
  fail "core/constants.uc shell-env did not derive P99_CONFIG"
[ "$TMP_RULESET_FOLDER" = "/tmp/sing-box/rulesets" ] ||
  fail "core/constants.uc shell-env did not derive TMP_RULESET_FOLDER"
[ "$BYEDPI_PID_DIR" = "/var/run/p99/byedpi/pid" ] ||
  fail "core/constants.uc shell-env did not derive BYEDPI_PID_DIR"

[ "$(ucode -L "$P99_LIB" "$CONSTANTS_UC" get FAKEIP_TEST_DOMAIN)" = "fakeip.podkop.fyi" ] ||
  fail "FakeIP diagnostics endpoint mismatch"
[ "$(ucode -L "$P99_LIB" "$CONSTANTS_UC" get CHECK_PROXY_IP_DOMAIN)" = "ip.podkop.fyi" ] ||
  fail "public IP diagnostics endpoint mismatch"

if ucode -L "$P99_LIB" "$PACKAGES_UC" installed p99-definitely-missing >/dev/null 2>&1; then
  fail "missing package must not be reported installed"
fi

# 4. Rules math and validation
mark_hex="$(ucode -L "$P99_LIB" "$RULES_UC" mark-hex 0x01000000 2)"
[ "$mark_hex" = "0x01000002" ] ||
  fail "providers/rules.uc mark math changed"

ucode -L "$P99_LIB" -- "$ZAPRET2_VALIDATOR_UC" validate-json nfqws2 '--name p99 --intercept=1' >/dev/null ||
  fail "providers/zapret2/validator.uc must validate nfqws2 strategies"
if ucode -L "$P99_LIB" -- "$ZAPRET2_VALIDATOR_UC" validate-json nfqws '--dpi-desync=fake' >/dev/null 2>&1; then
  fail "providers/zapret2/validator.uc must reject nfqws strategies"
fi

printf 'table inet x { chain y { queue num 4301 bypass } }\n' |
  ucode -L "$P99_LIB" "$ZAPRET2_CHECK_UC" nft-queue-overlap P99Table 4300 4555 >/dev/null ||
  fail "providers/zapret2/check.uc must check queue overlap"

# 5. Sing-box runtime helpers
sb_version="$(printf 'sing-box version 1.12.4-extended\nEnvironment: test\n' |
  ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" version-from-output)"
[ "$sb_version" = "1.12.4-extended" ] ||
  fail "singbox/runtime.uc version-from-output changed"

ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" is-extended "1.12.4-extended" >/dev/null ||
  fail "extended sing-box version should be detected"
if ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" is-extended "1.12.4" >/dev/null 2>&1; then
  fail "stable sing-box version must not be detected as extended"
fi
ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" supports-tailscale "" "$(printf 'Tags: with_quic,with_tailscale\n')" >/dev/null ||
  fail "with_tailscale build tag should be detected"

SB_VERSION_STATE_FILE="$WORK_DIR/version" \
  ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" write-version-state 1.2.3 >/dev/null ||
  fail "version state write failed"
[ "$(SB_VERSION_STATE_FILE="$WORK_DIR/version" ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" read-version-state)" = "1.2.3" ] ||
  fail "version state read failed"
SB_VERSION_STATE_FILE="$WORK_DIR/version" \
  ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" restore-version-state "" >/dev/null ||
  fail "version state restore-clear failed"
[ ! -e "$WORK_DIR/version" ] ||
  fail "empty version state restore must clear the state file"

SB_VARIANT_STATE_FILE="$WORK_DIR/variant" \
  ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" write-variant-marker extended-compressed >/dev/null ||
  fail "variant marker write failed"
SB_VARIANT_STATE_FILE="$WORK_DIR/variant" \
  ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" marker-is extended-compressed >/dev/null ||
  fail "variant marker check failed"
[ "$(SB_VARIANT_STATE_FILE="$WORK_DIR/variant" ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" read-variant-marker)" = "extended-compressed" ] ||
  fail "variant marker read failed"
SB_VARIANT_STATE_FILE="$WORK_DIR/variant" \
  ucode -L "$P99_LIB" "$SINGBOX_RUNTIME_UC" restore-variant-marker "" >/dev/null ||
  fail "variant marker restore-clear failed"
[ ! -e "$WORK_DIR/variant" ] ||
  fail "empty variant marker restore must clear the marker file"

# 6. Provider status and check shapes
cat >"$WORK_DIR/apk" <<'SH'
#!/usr/bin/env sh
set -eu
case "$*" in
  "info -e byedpi") exit 0 ;;
  "list --installed byedpi")
    printf '<byedpi> byedpi-0.17.3-r1 aarch64_cortex-a53 {feeds/base/byedpi} [installed]\n'
    ;;
  "list --installed --manifest byedpi"|"info -v byedpi")
    printf 'byedpi: Local SOCKS proxy server to bypass DPI (Deep Packet Inspection)\n'
    ;;
  *) exit 1 ;;
esac
SH
chmod +x "$WORK_DIR/apk"

byedpi_ver="$(P99_LIB="$P99_LIB" PATH="$WORK_DIR:$PATH" ucode -L "$P99_LIB" "$BYEDPI_RUNTIME_UC" package-version)"
[ "$byedpi_ver" = "0.17.3-r1" ] ||
  fail "ByeDPI APK version was parsed as '$byedpi_ver'"

P99_LIB="$P99_LIB" BYEDPI_BIN="$ROOT_DIR/tests/missing-ciadpi" \
  ucode -L "$P99_LIB" "$BYEDPI_RUNTIME_UC" check |
  node -e '
const fs = require("fs");
const value = JSON.parse(fs.readFileSync(0, "utf8"));
if (value.byedpi_installed !== false || value.byedpi_package_installed !== false) {
  process.exit(1);
}
' || fail "unexpected ByeDPI check JSON"

status_json="$(P99_CONFIG_NAME=p99-definitely-missing ucode -L "$P99_LIB" "$ZAPRET_RUNTIME_UC" status)"
JSON_VALUE="$status_json" node - <<'NODE' || fail "zapret status shape mismatch"
const value = JSON.parse(process.env.JSON_VALUE);
if (value.configured !== false || value.enabled_rule_count !== 0 || typeof value.provider_path !== "string") {
  process.exit(1);
}
NODE

check_json="$(ucode -L "$P99_LIB" "$ZAPRET2_RUNTIME_UC" check)"
JSON_VALUE="$check_json" node - <<'NODE' || fail "zapret2 check shape mismatch"
const value = JSON.parse(process.env.JSON_VALUE);
if (!Object.prototype.hasOwnProperty.call(value, "zapret2_installed") ||
    !Object.prototype.hasOwnProperty.call(value, "zapret2_package_installed") ||
    !Object.prototype.hasOwnProperty.call(value, "zapret2_provider_path")) {
  process.exit(1);
}
NODE

# 7. Service lifecycle contracts
sing_box_start_line="$(grep -nF 'command_success_from_args([ "/etc/init.d/sing-box", "start" ])' "$LIFECYCLE_UC" | head -n1 | cut -d: -f1)"
early_stable_line="$(awk -v start="$sing_box_start_line" 'NR > start && /"wait-p99-stable-start"/ { print NR; exit }' "$LIFECYCLE_UC")"
deferred_bootstrap_line="$(grep -nF '"run-deferred-bootstrap"' "$LIFECYCLE_UC" | head -n1 | cut -d: -f1)"
[ -n "$sing_box_start_line" ] && [ -n "$early_stable_line" ] && [ "$early_stable_line" -lt "$deferred_bootstrap_line" ] ||
  fail "service/lifecycle.uc must verify sing-box stability before deferred bootstrap"

sing_box_reload_line="$(grep -nF '"reload-sing-box-runtime"' "$LIFECYCLE_UC" | head -n1 | cut -d: -f1)"
reload_stable_min_age_line="$(awk -v start="$sing_box_reload_line" 'NR > start && /SING_BOX_START_STABLE_MIN_AGE/ { print NR; exit }' "$LIFECYCLE_UC")"
[ -n "$sing_box_reload_line" ] && [ -n "$reload_stable_min_age_line" ] ||
  fail "service/lifecycle.uc must use dedicated sing-box stability window on reload"

printf 'backend ownership smoke checks passed\n'
