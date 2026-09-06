#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECTION_JS="$ROOT_DIR/luci-app-p99/htdocs/luci-static/resources/view/p99/section.js"
SETTINGS_JS="$ROOT_DIR/luci-app-p99/htdocs/luci-static/resources/view/p99/settings.js"
MAIN_JS="$ROOT_DIR/luci-app-p99/htdocs/luci-static/resources/view/p99/main.js"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

# 1. Verify duration validation contracts
for file in "$SETTINGS_JS" "$SECTION_JS"; do
  grep -Fq 'function isSingBoxDuration(' "$file" ||
    fail "isSingBoxDuration must be defined in $(basename "$file")"
done

node - "$MAIN_JS" <<'NODE'
const fs = require('fs');
const main = fs.readFileSync(process.argv[2], 'utf8');
for (const fn of ['isSingBoxDuration', 'validateOptionalSingBoxDuration', 'validateRequiredSingBoxDuration']) {
  if (!main.includes(fn)) {
    console.error(`FAIL: main.js must export ${fn}`);
    process.exit(1);
  }
}
NODE

# 2. Verify section cascade contracts
node - "$SECTION_JS" <<'NODE'
const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync(process.argv[2], 'utf8');

const match = source.match(
  /function configureSectionSection\(sectionRef, options = \{\}\) \{[\s\S]*?\n\}\n\nconst EntryPoint/,
);
assert(match, 'configureSectionSection not found in section.js');

const cleanupCalls = [];
function setActionProvidersAvailabilityLoader() {}
function loadSectionTableOptions() {}
function cleanupRemovedChildItems(...args) {
  cleanupCalls.push(args);
}
eval(match[0].slice(0, -'\n\nconst EntryPoint'.length));

const event = {};
const result = {};
let parentArgs;
let parentThis;
const sectionRef = {
  handleRemove(...args) {
    parentArgs = args;
    parentThis = this;
    return result;
  },
};
configureSectionSection(sectionRef);

assert.strictEqual(sectionRef.handleRemove('parent', event), result);
assert.deepStrictEqual(cleanupCalls, [
  ['parent', 'subscription_url', []],
  ['parent', 'section_interface', []],
  ['parent', 'urltest', []],
  ['parent', 'priority_group', []],
]);
assert.deepStrictEqual(parentArgs, ['parent', event]);
assert.strictEqual(parentThis, sectionRef);
assert.match(
  source,
  /typeName === "priority_group"[\s\S]*cleanupPriorityLevelsForGroup\(itemId\)/,
  'priority_group cleanup does not cascade to priority_level',
);
NODE

# 3. Verify network interface and stacked modal contracts
grep -Fq 'function dnsTypeChoices() {' "$SECTION_JS" ||
  fail "network interface settings must define DNS protocol choices"
grep -Fq 'dnsTypeChoices().forEach((choice) => o.value(choice.value, choice.label));' "$SECTION_JS" ||
  fail "network interface settings must populate the DNS protocol field"
grep -Fq 'o.renderItemSettingsModal = showInterfaceSettingsModal;' "$SECTION_JS" ||
  fail "network interfaces must keep their settings modal handler"

grep -Fq 'renderStackedJsonSettingsModal' "$SECTION_JS" ||
  fail "stacked settings modal must exist in section.js"
grep -Fq 'fkp-stacked-settings-validation-summary' "$SECTION_JS" ||
  fail "stacked settings modal must retain validation summary class"

# 4. Verify built-in and secondary ruleset integration
node - "$SECTION_JS" "$MAIN_JS" <<'NODE'
const fs = require('fs');
const section = fs.readFileSync(process.argv[2], 'utf8');
const main = fs.readFileSync(process.argv[3], 'utf8');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

for (const option of ['russia_inside', 'russia_outside', 'ukraine_inside']) {
  if (!main.includes(`${option}:`)) {
    fail(`${option} must remain available as a built-in rule set`);
  }
}

for (const option of ['blizzard', 'valve', 'hetzner', 'anthropic', 'google']) {
  if (!main.includes(`${option}:`)) {
    fail(`${option} must be available in built-in rule sets #2`);
  }
}

for (const required of [
  '`${_("Built-in rule sets")} #2`',
  'Greeg0ry/b4geoip-p99/main/srs/',
  'SECONDARY_RULESET_OPTIONS',
]) {
  if (!section.includes(required)) {
    fail(`secondary built-in rule set integration is missing: ${required}`);
  }
}
NODE

printf 'LuCI contracts smoke checks passed\n'
