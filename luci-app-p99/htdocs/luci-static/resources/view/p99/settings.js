"use strict";
"require baseclass";
"require form";
"require uci";
"require ui";
"require view.p99.main as main";

function isSingBoxDuration(value) {
  return typeof main !== "undefined" && main.isSingBoxDuration
    ? main.isSingBoxDuration(value)
    : /^(?=.*[1-9])([0-9]+(?:\.[0-9]+)?(?:ns|us|ms|s|m|h|d))+$/.test(value);
}

const EntryPoint = {
  createSettingsContent: function (section, capabilities) {
    return main.createSettingsContent(section, capabilities);
  },
};

return baseclass.extend(EntryPoint);
