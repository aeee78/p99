#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
P99_BIN="$ROOT_DIR/p99/files/usr/bin/p99"
P99_LIB="$ROOT_DIR/p99/files/usr/lib"
PACKAGE_UC="$P99_LIB/service/package.uc"
P99_MAKEFILE="$ROOT_DIR/p99/Makefile"
LUCI_UCI_DEFAULTS="$ROOT_DIR/luci-app-p99/root/etc/uci-defaults/50_luci-p99"
BUILD_SCRIPT="$ROOT_DIR/build.sh"
WORK_DIR="$(mktemp -d)"
export P99_PACKAGE_UPGRADE_STATE="$WORK_DIR/package-was-running"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

[ -r "$PACKAGE_UC" ] ||
  fail "service/package.uc must own package lifecycle logic"
if grep -n -E 'require\("uci"\)\.cursor|uci -q|uci", "-q"' "$PACKAGE_UC" >/dev/null 2>&1; then
  fail "service/package.uc must use core.uci instead of direct UCI cursor or CLI access"
fi
grep -Fq 'require("core.uci")' "$PACKAGE_UC" ||
  fail "service/package.uc must import core.uci"
grep -Fq 'package_prerm: [ "service/package.uc", "prerm", 1 ]' "$P99_BIN" ||
  fail "p99 entrypoint must dispatch package prerm cleanup through service/package.uc"
grep -Fq 'package_postinst: [ "service/package.uc", "postinst", 0 ]' "$P99_BIN" ||
  fail "p99 entrypoint must dispatch package postinst recovery through service/package.uc"
grep -Fq 'luci_postinst: [ "service/package.uc", "luci-postinst", 0 ]' "$P99_BIN" ||
  fail "p99 entrypoint must dispatch LuCI postinstall cleanup through service/package.uc"
grep -Fq '#!/bin/sh' "$LUCI_UCI_DEFAULTS" ||
  fail "LuCI uci-defaults must remain a shell script because OpenWrt default_postinst runs it through shell"
grep -Fq '/usr/bin/p99 luci_postinst' "$LUCI_UCI_DEFAULTS" ||
  fail "LuCI uci-defaults must delegate cache/rpcd handling to ucode"
if grep -E 'rm -f /var/luci-indexcache|rm -f /tmp/luci-indexcache|logger -t "p99"' "$LUCI_UCI_DEFAULTS" >/dev/null; then
  fail "LuCI uci-defaults must not own cache/logger shell logic"
fi

if grep -n -E 'grep -q "105 p99"|sed -i "/105 p99|p99_dont_touch_dhcp=.*uci|cp /etc/config/p99|rm -f /tmp/luci-indexcache|killall -HUP rpcd' "$P99_MAKEFILE" "$BUILD_SCRIPT" >/dev/null; then
  fail "package scripts must not keep backend/LuCI lifecycle business logic in shell"
fi
grep -Fq '#!/usr/bin/ucode' "$P99_MAKEFILE" ||
  fail "p99 Makefile package hooks must use ucode entrypoints"
grep -Fq '/usr/bin/p99 package_prerm' "$P99_MAKEFILE" ||
  fail "p99 Makefile prerm must delegate cleanup to package_prerm"
grep -Fq '/usr/bin/p99 package_postinst' "$P99_MAKEFILE" ||
  fail "p99 Makefile postinst must restore a service that was running before upgrade"
grep -Fq '/usr/bin/p99 package_prerm upgrade' "$BUILD_SCRIPT" ||
  fail "manual APK pre-upgrade must record and stop the running service"
grep -Fq '/usr/bin/p99 package_postinst' "$BUILD_SCRIPT" ||
  fail "manual packages must restore a service that was running before upgrade"
grep -Fq '/usr/share/p99/defaults/p99' "$P99_MAKEFILE" ||
  fail "p99 package must include a recovery copy of the default configuration"
grep -Fq 'usr/share/p99/defaults/p99' "$BUILD_SCRIPT" ||
  fail "manual packages must include a recovery copy of the default configuration"
if grep -Fq '/usr/bin/p99 luci_postinst' "$BUILD_SCRIPT"; then
  fail "manual package hooks must let default_postinst run luci_postinst exactly once through uci-defaults"
fi
if grep -n -E 'Package/p99/preinst|copy_legacy_config|P99_LEGACY_CONFIG|mode == "preinst"' \
  "$P99_MAKEFILE" "$BUILD_SCRIPT" "$PACKAGE_UC" >/dev/null 2>&1; then
  fail "package hooks and runtime service must not own configuration migration"
fi

rt_tables="$WORK_DIR/rt_tables"
cat >"$rt_tables" <<'EOF'
100 main
105 p99
200 custom
EOF
P99_PACKAGE_TEST_MODE=1 P99_RT_TABLES="$rt_tables" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" prerm
if grep -Fq '105 p99' "$rt_tables"; then
  fail "package prerm must remove the P99 routing table entry"
fi
grep -Fq '200 custom' "$rt_tables" ||
  fail "package prerm must preserve unrelated rt_tables entries"

cat >"$WORK_DIR/p99-init" <<'SH'
#!/usr/bin/env bash
grep -Fq '105 p99' "${P99_RT_TABLES:?}" || exit 1
printf '%s\n' 'stop-with-route-table' >>"${P99_STOP_LOG:?}"
SH
chmod 0755 "$WORK_DIR/p99-init"
cat >"$WORK_DIR/stop-order.state" <<'EOF_UCI'
p99.settings=settings
p99.settings.dont_touch_dhcp=1
EOF_UCI
printf '105 p99\n' >"$WORK_DIR/rt_tables_stop_order"
: >"$WORK_DIR/stop-order.log"
P99_UCI_STATE_FILE="$WORK_DIR/stop-order.state" \
P99_INIT="$WORK_DIR/p99-init" \
P99_STOP_LOG="$WORK_DIR/stop-order.log" \
P99_BIN="$WORK_DIR/missing-p99-bin" \
P99_DNS_APPLY_UC="$WORK_DIR/missing-dns-apply.uc" \
P99_SING_BOX_INIT="$WORK_DIR/missing-sing-box-init" \
P99_SING_BOX_BIN="$WORK_DIR/missing-sing-box-bin" \
P99_SING_BOX_CRONET="$WORK_DIR/missing-cronet" \
P99_RT_TABLES="$WORK_DIR/rt_tables_stop_order" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" prerm
grep -Fxq 'stop-with-route-table' "$WORK_DIR/stop-order.log" ||
  fail "package prerm must stop P99 before removing its routing table name"
[ ! -s "$WORK_DIR/rt_tables_stop_order" ] ||
  fail "package prerm must remove the routing table name after P99 stops"

printf '%s\n' "config settings 'settings'" >"$WORK_DIR/default-p99"
printf '%s\n' 'p99.settings=settings' >"$WORK_DIR/config.state"
mkdir -p "$WORK_DIR/component-update-checks"
touch "$WORK_DIR/component-update-checks/p99.json"
touch "$WORK_DIR/component-update-check.timestamp"
P99_PACKAGE_TEST_MODE=1 \
P99_CONFIG_PATH="$WORK_DIR/config-p99" \
P99_DEFAULT_CONFIG_PATH="$WORK_DIR/default-p99" \
P99_UCI_STATE_FILE="$WORK_DIR/config.state" \
P99_COMPONENT_UPDATE_CHECK_CACHE_DIR="$WORK_DIR/component-update-checks" \
P99_COMPONENT_UPDATE_CHECK_STATE_FILE="$WORK_DIR/component-update-check.timestamp" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" postinst
cmp -s "$WORK_DIR/default-p99" "$WORK_DIR/config-p99" ||
  fail "package postinst must restore a missing P99 configuration from packaged defaults"
[ ! -e "$WORK_DIR/component-update-checks/p99.json" ] ||
  fail "package postinst must remove cached component update results"
[ ! -e "$WORK_DIR/component-update-check.timestamp" ] ||
  fail "package postinst must remove the component update check timestamp"

printf '%s\n' "config settings 'custom'" >"$WORK_DIR/config-p99"
cp "$WORK_DIR/config-p99" "$WORK_DIR/config-p99.expected"
P99_PACKAGE_TEST_MODE=1 \
P99_CONFIG_PATH="$WORK_DIR/config-p99" \
P99_DEFAULT_CONFIG_PATH="$WORK_DIR/default-p99" \
P99_UCI_STATE_FILE="$WORK_DIR/config.state" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" postinst
cmp -s "$WORK_DIR/config-p99.expected" "$WORK_DIR/config-p99" ||
  fail "package postinst must preserve an existing user configuration"

cat >"$WORK_DIR/config-p99" <<'EOF_CONFIG_105'
config settings 'settings'
        option config_version '1.0.5'
        option custom_remote_setting 'preserve-me'
EOF_CONFIG_105
cp "$WORK_DIR/config-p99" "$WORK_DIR/config-p99-1.0.5.expected"
P99_PACKAGE_TEST_MODE=1 \
P99_CONFIG_PATH="$WORK_DIR/config-p99" \
P99_DEFAULT_CONFIG_PATH="$WORK_DIR/default-p99" \
P99_UCI_STATE_FILE="$WORK_DIR/config.state" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" postinst
cmp -s "$WORK_DIR/config-p99-1.0.5.expected" "$WORK_DIR/config-p99" ||
  fail "1.0.5 package upgrade must preserve the existing user configuration"
cp "$WORK_DIR/config-p99.expected" "$WORK_DIR/config-p99"

if P99_PACKAGE_TEST_MODE=1 \
  P99_CONFIG_PATH="$WORK_DIR/unrecoverable-config" \
  P99_DEFAULT_CONFIG_PATH="$WORK_DIR/missing-default-config" \
  P99_UCI_STATE_FILE="$WORK_DIR/config.state" \
    ucode -L "$P99_LIB" "$PACKAGE_UC" postinst 2>/dev/null; then
  fail "package postinst must fail when a missing configuration cannot be restored"
fi

printf '%s\n' 'not-a-p99-section=value' >"$WORK_DIR/invalid-config.state"
if P99_PACKAGE_TEST_MODE=1 \
  P99_CONFIG_PATH="$WORK_DIR/config-p99" \
  P99_DEFAULT_CONFIG_PATH="$WORK_DIR/default-p99" \
  P99_UCI_STATE_FILE="$WORK_DIR/invalid-config.state" \
    ucode -L "$P99_LIB" "$PACKAGE_UC" postinst 2>/dev/null; then
  fail "package postinst must reject a configuration without the required settings section"
fi
cmp -s "$WORK_DIR/config-p99.expected" "$WORK_DIR/config-p99" ||
  fail "package postinst must preserve an invalid non-empty user configuration"

touch "$WORK_DIR/luci-indexcache.one" "$WORK_DIR/luci-indexcache.two"
P99_PACKAGE_TEST_MODE=1 P99_LUCI_CACHE_GLOBS="$WORK_DIR/luci-indexcache*" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" luci-postinst
if compgen -G "$WORK_DIR/luci-indexcache*" >/dev/null; then
  fail "luci-postinst must remove LuCI index cache files"
fi

cat >"$WORK_DIR/p99-bin" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${P99_RESTORE_LOG:?}"
SH
chmod 0755 "$WORK_DIR/p99-bin"

cat >"$WORK_DIR/dont-touch.state" <<'EOF_UCI'
p99.settings=settings
p99.settings.dont_touch_dhcp=1
EOF_UCI
printf '105 p99\n' >"$WORK_DIR/rt_tables_dont_touch"
: >"$WORK_DIR/restore-dont-touch.log"
P99_UCI_STATE_FILE="$WORK_DIR/dont-touch.state" \
P99_RESTORE_LOG="$WORK_DIR/restore-dont-touch.log" \
P99_BIN="$WORK_DIR/p99-bin" \
P99_DNS_APPLY_UC="$WORK_DIR/missing-dns-apply.uc" \
P99_SING_BOX_INIT="$WORK_DIR/missing-sing-box-init" \
P99_SING_BOX_BIN="$WORK_DIR/missing-sing-box-bin" \
P99_SING_BOX_CRONET="$WORK_DIR/missing-cronet" \
P99_RT_TABLES="$WORK_DIR/rt_tables_dont_touch" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" prerm
[ ! -s "$WORK_DIR/restore-dont-touch.log" ] ||
  fail "package prerm must skip dnsmasq restore when dont_touch_dhcp is enabled"

cat >"$WORK_DIR/restore.state" <<'EOF_UCI'
p99.settings=settings
p99.settings.dont_touch_dhcp=0
EOF_UCI
printf '105 p99\n' >"$WORK_DIR/rt_tables_restore"
: >"$WORK_DIR/restore.log"
P99_UCI_STATE_FILE="$WORK_DIR/restore.state" \
P99_RESTORE_LOG="$WORK_DIR/restore.log" \
P99_BIN="$WORK_DIR/p99-bin" \
P99_DNS_APPLY_UC="$WORK_DIR/missing-dns-apply.uc" \
P99_SING_BOX_INIT="$WORK_DIR/missing-sing-box-init" \
P99_SING_BOX_BIN="$WORK_DIR/missing-sing-box-bin" \
P99_SING_BOX_CRONET="$WORK_DIR/missing-cronet" \
P99_RT_TABLES="$WORK_DIR/rt_tables_restore" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" prerm
grep -Fxq 'restore_dnsmasq' "$WORK_DIR/restore.log" ||
  fail "package prerm must restore dnsmasq when dont_touch_dhcp is disabled"

cat >"$WORK_DIR/upgrade-init" <<'SH'
#!/usr/bin/env bash
case "$1" in
  status) exit "${P99_FAKE_STATUS:-0}" ;;
  start) printf '%s\n' start >>"${P99_START_LOG:?}" ;;
esac
SH
chmod 0755 "$WORK_DIR/upgrade-init"
: >"$WORK_DIR/upgrade-start.log"
: >"$WORK_DIR/rt_tables_upgrade"
P99_PACKAGE_TEST_MODE=1 \
P99_INIT="$WORK_DIR/upgrade-init" \
P99_START_LOG="$WORK_DIR/upgrade-start.log" \
P99_RT_TABLES="$WORK_DIR/rt_tables_upgrade" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" prerm upgrade
[ -f "$P99_PACKAGE_UPGRADE_STATE" ] ||
  fail "package pre-upgrade must remember a running service"
P99_PACKAGE_TEST_MODE=1 \
P99_INIT="$WORK_DIR/upgrade-init" \
P99_START_LOG="$WORK_DIR/upgrade-start.log" \
P99_CONFIG_PATH="$WORK_DIR/config-p99" \
P99_DEFAULT_CONFIG_PATH="$WORK_DIR/default-p99" \
P99_UCI_STATE_FILE="$WORK_DIR/config.state" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" postinst
grep -Fxq start "$WORK_DIR/upgrade-start.log" ||
  fail "package postinst must restart a service that was running before upgrade"
[ ! -e "$P99_PACKAGE_UPGRADE_STATE" ] ||
  fail "package postinst must clear the consumed upgrade state"

P99_PACKAGE_TEST_MODE=1 \
P99_FAKE_STATUS=1 \
P99_INIT="$WORK_DIR/upgrade-init" \
P99_RT_TABLES="$WORK_DIR/rt_tables_upgrade" \
  ucode -L "$P99_LIB" "$PACKAGE_UC" prerm upgrade
[ ! -e "$P99_PACKAGE_UPGRADE_STATE" ] ||
  fail "package pre-upgrade must not mark an already stopped service"

printf 'package lifecycle checks passed\n'
