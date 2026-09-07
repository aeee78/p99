#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAIN_JS="$ROOT_DIR/luci-app-p99/htdocs/luci-static/resources/view/p99/main.js"
MONITORING_STYLES="$ROOT_DIR/fe-app-p99/src/p99/tabs/monitoring/styles.ts"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

urltest_options="$(sed -n '/^function addUrlTestItemOptions(/,/^function priorityLevelSettingsForValidation(/p' "$MAIN_JS")"
priority_options="$(sed -n '/^function addPriorityLevelItemOptions(/,/^function addPriorityGroupItemOptions(/p' "$MAIN_JS")"
dashboard_options="$(sed -n '/^function addDashboardServerFilterOptions(/,/^function loadSectionTableOptions(/p' "$MAIN_JS")"
create_section="$(sed -n '/^function createSectionContent(/,/^function getUiCapabilities(/p' "$MAIN_JS")"
live_choices="$(sed -n '/^function configureLiveDynamicListChoices(/,/^function countryChoices/p' "$MAIN_JS")"

grep -Fq 'if (key === "include_regex") {' <<<"$urltest_options" ||
  fail "URLTest include proxy parameters must follow the include regex option"
grep -Fq 'else if (key === "exclude_regex") {' <<<"$urltest_options" ||
  fail "URLTest exclude proxy parameters must follow the exclude regex option"
(grep -Fq 'configureLiveDynamicListChoices(' <<<"$urltest_options" &&
  grep -Fq '(itemId, values) =>' <<<"$urltest_options") ||
  fail "URLTest server filters must stay comboboxes when no choices exist"
grep -Fq 'if (key === "regex") {' <<<"$priority_options" ||
  fail "Priority include proxy parameters must follow the include regex option"
grep -Fq 'else if (key === "exclude_regex") {' <<<"$priority_options" ||
  fail "Priority exclude proxy parameters must follow the exclude regex option"
(grep -Fq 'configureLiveDynamicListChoices(' <<<"$priority_options" &&
  grep -Fq '(itemId, values) =>' <<<"$priority_options") ||
  fail "Priority server filters must stay comboboxes when no choices exist"
grep -Fq '["direct", "Direct"]' "$MAIN_JS" ||
  fail "proxy protocol choices must keep Direct untranslated"
grep -Fq '["none", "None"]' "$MAIN_JS" ||
  fail "proxy security choices must keep None untranslated"
grep -Fq '_("Security")' "$MAIN_JS" ||
  fail "proxy parameter filters must use the short Security label"
if grep -Fq 'Connection security' "$MAIN_JS"; then
  fail "proxy parameter filter copy must not mention connection security"
fi
if grep -Fq 'hide_added_outbounds' "$MAIN_JS"; then
  fail "per-group dashboard hiding must be removed from LuCI"
fi
grep -Fq '"dashboard_filter_mode"' <<<"$dashboard_options" ||
  fail "section settings must expose the dashboard server filter"
grep -Fq '_("Servers on dashboard")' <<<"$dashboard_options" ||
  fail "dashboard server filter must use the requested section-level label"
grep -Fq '_("Filter the servers that will be displayed on the dashboard.")' <<<"$dashboard_options" ||
  fail "dashboard server filter must use the requested description"
grep -Fq 'option.modalonly = true;' <<<"$dashboard_options" ||
  fail "dashboard server filter options must stay inside the section modal"
grep -Fq '"dashboard_include_groups"' <<<"$dashboard_options" ||
  fail "dashboard include filters must support URLTest and Priority groups"
grep -Fq '"dashboard_exclude_groups"' <<<"$dashboard_options" ||
  fail "dashboard exclude filters must support URLTest and Priority groups"
include_group_line="$(grep -n '"dashboard_include_groups"' <<<"$dashboard_options" | head -n1 | cut -d: -f1)"
include_proxy_line="$(grep -n 'includeProxyParameterOptions' <<<"$dashboard_options" | tail -n1 | cut -d: -f1)"
[[ "$include_group_line" -lt "$include_proxy_line" ]] ||
  fail "dashboard include group selector must precede the proxy-parameter toggle"
exclude_group_line="$(grep -n '"dashboard_exclude_groups"' <<<"$dashboard_options" | head -n1 | cut -d: -f1)"
exclude_proxy_line="$(grep -n 'excludeProxyParameterOptions' <<<"$dashboard_options" | tail -n1 | cut -d: -f1)"
[[ "$exclude_group_line" -lt "$exclude_proxy_line" ]] ||
  fail "dashboard exclude group selector must precede the proxy-parameter toggle"
grep -Fq 'const liveValues = currentLiveDynamicListValues(section_id, typeName);' "$MAIN_JS" ||
  fail "dashboard group choices must read live uncommitted DynamicList values"
grep -Fq 'o.onListChange = refreshDashboardFilterChoiceWidgets;' "$MAIN_JS" ||
  fail "new servers and groups must refresh dashboard selectors immediately"
grep -Fq 'form.DynamicList,' <<<"$(sed -n '/^function addDashboardGroupFilterOption(/,/^function addDashboardServerFilterOptions(/p' "$MAIN_JS")" ||
  fail "dashboard group filters must use the standard DynamicList"
if grep -Fq 'SelectOnlyUIDynamicList' "$MAIN_JS"; then
  fail "dashboard group filters must not replace the standard DynamicList widget"
fi
grep -Fq 'configureLiveDynamicListChoices(list, currentOutboundNameChoices);' <<<"$dashboard_options" ||
  fail "dashboard server selectors must refresh live uncommitted outbound choices"
grep -Fq 'configureLiveDynamicListChoices(list, currentSectionGroupChoices);' "$MAIN_JS" ||
  fail "dashboard group selectors must refresh live uncommitted group choices"
grep -Fq 'const widget = new ui.DynamicList(values, labels, {' <<<"$live_choices" ||
  fail "dashboard selectors must always render the stock DynamicList combobox"
grep -Fq 'validate: L.bind(this.validate, this, section_id),' <<<"$live_choices" ||
  fail "dashboard selectors must use the LuCI 24.10-compatible validator binding"
if grep -Fq 'this.getValidator(section_id)' <<<"$live_choices"; then
  fail "dashboard selectors must not require the newer LuCI getValidator API"
fi
grep -Fq 'const node = widget.render();' <<<"$live_choices" ||
  fail "dashboard selectors must refresh their rendered DynamicList instance directly"
if grep -Fq 'form.DynamicList.prototype.renderWidget' <<<"$live_choices"; then
  fail "empty dashboard choices must not fall back to a plain DynamicList input"
fi
grep -Fq 'dashboardFilterChoiceRefreshers.get(section_id).add(refreshChoices);' <<<"$live_choices" ||
  fail "dashboard selectors must register the rendered modal widget for source changes"
grep -Fq 'node.addEventListener("mousedown", refreshBeforeOpening, true);' <<<"$live_choices" ||
  fail "dashboard selectors must refresh choices before opening"
grep -Fq 'if (currentSignature === choiceSignature)' "$MAIN_JS" ||
  fail "dashboard selectors must not rebuild unchanged choices while selecting an item"
grep -Fq 'loadOutboundNameChoices(section_id).then(() => {' <<<"$dashboard_options" ||
  fail "dashboard server choices must refresh after metadata loads"
if grep -Fq 'return loadOutboundNameChoices(section_id)' <<<"$dashboard_options"; then
  fail "dashboard metadata loading must not block the section modal"
fi
grep -Fq 'result.push({ value: name, label: name });' "$MAIN_JS" ||
  fail "dashboard group selector values must use display names"
if grep -Fq 'label: `${typeLabel}: ${name}`' "$MAIN_JS"; then
  fail "dashboard group labels must not include URLTest/Priority prefixes"
fi
ports_line="$(grep -n 'dependsOnRoutingAction(portsOption);' <<<"$create_section" | cut -d: -f1)"
dashboard_line="$(grep -n 'addDashboardServerFilterOptions(section);' <<<"$create_section" | cut -d: -f1)"
[[ "$dashboard_line" -gt "$ports_line" ]] ||
  fail "dashboard server filter must be the last section option block"
if grep -Fq '__p99_no_group__' "$MAIN_JS"; then
  fail "dashboard group selectors must not duplicate the placeholder with a fake choice"
fi

grep -Fq 'dependsOnRoutingAction(domainIpListsOption);' <<<"$create_section" ||
  fail "routing actions must use their own domain and subnet list copy"
grep -Fq 'dnsDomainListsOption.depends("action", "dns");' <<<"$create_section" ||
  fail "DNS actions must use their own domain-only list copy"
[[ "$(grep -Fc 'writeListOption(section_id, "domain_ip_lists", value);' <<<"$create_section")" -eq 2 ]] ||
  fail "both list views must write the shared domain_ip_lists option"
grep -Fq 'Add URLs or local paths to .srs / .json lists. Subnets are ignored by default.' <<<"$create_section" ||
  fail "routing rule-set copy must explain the default subnet behavior"
grep -Fq 'Add URLs or local paths to .lst lists containing domains. IP entries are ignored.' <<<"$create_section" ||
  fail "DNS list copy must explain that IP entries are ignored"

printf 'LuCI DynamicList layout checks passed\n'
