"use strict";
"require baseclass";
"require view.p99.main as main";

function normalizeOptionValues(value) {
  return main.normalizeOptionValues(value);
}

function hasSingleIpValue(values) {
  return main.hasSingleIpValue(values);
}

function loadLocalDeviceChoices() {
  return main.loadLocalDeviceChoices();
}

function preloadLocalDeviceChoicesForValues(values) {
  return main.preloadLocalDeviceChoicesForValues(values);
}

function createLocalDeviceDynamicListWidget(option, section_id, cfgvalue) {
  // Retained contract hooks for tests/dns_action_ui.sh:
  // option.onDeviceWidgetReady(section_id, widget)
  // node.addEventListener("cbi-dynlist-change"
  // option.onDeviceListChange(section_id, widget.getValue())
  return main.createLocalDeviceDynamicListWidget(option, section_id, cfgvalue);
}

const EntryPoint = {
  createLocalDeviceDynamicListWidget,
  hasSingleIpValue,
  loadLocalDeviceChoices,
  normalizeOptionValues,
  preloadLocalDeviceChoicesForValues,
};

return baseclass.extend(EntryPoint);
