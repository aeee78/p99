"use strict";
"require view";
"require form";
"require baseclass";
"require uci";
"require ui";
"require view.p99.main as main";

// Global settings
"require view.p99.settings as settings";

// Sections
"require view.p99.section as section";

// Subscriptions
"require view.p99.subscriptions as subscriptions";

// Dashboard
"require view.p99.dashboard as dashboard";

// Monitoring
"require view.p99.monitoring as monitoring";

// Diagnostic
"require view.p99.diagnostic as diagnostic";

// Updates
"require view.p99.updates as updates";

const EntryPoint = {
  render: function () {
    return main.renderP99View({
      dashboard: dashboard,
      section: section,
      subscriptions: subscriptions,
      settings: settings,
      diagnostic: diagnostic,
      monitoring: monitoring,
      updates: updates,
    });
  },
};

return view.extend(EntryPoint);
