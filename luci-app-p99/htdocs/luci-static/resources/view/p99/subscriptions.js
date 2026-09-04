"use strict";
"require form";
"require uci";
"require baseclass";
"require ui";
"require view.p99.main as main";

const UCI_PACKAGE = main.P99_UCI_PACKAGE;

function isSingBoxDuration(value) {
  return /^(?=.*[1-9])([0-9]+(?:\.[0-9]+)?(?:ns|us|ms|s|m|h|d))+$/.test(value);
}

function validateSubscriptionUrl(value) {
  const trimmed = `${value || ""}`.trim();
  if (!trimmed) {
    return _("Subscription URL cannot be empty");
  }
  const validation = main.validateUrl(trimmed);
  return validation.valid ? true : validation.message;
}

function getUrlHostname(url) {
  try {
    const parsed = new URL(`${url || ""}`.trim());
    return parsed.hostname || url;
  } catch (e) {
    return url || "";
  }
}

function configureSubscriptionsSection(sectionRef) {
  sectionRef.anonymous = false;
  sectionRef.addremove = true;
  sectionRef.sortable = true;
  sectionRef.rowcolors = true;

  sectionRef.description = E(
    "div",
    {
      style:
        "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;",
    },
    [
      E(
        "span",
        {},
        _(
          "Manage remote subscriptions. Configure subscriptions once and select them in any section.",
        ),
      ),
      E(
        "button",
        {
          type: "button",
          class: "btn cbi-button-apply",
          click: function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            ui.showIndicator(
              "p99-updating-all",
              _("Updating all subscriptions..."),
            );
            return main.P99ShellMethods.subscriptionUpdateStart()
              .then(function (res) {
                if (!res || !res.success) {
                  throw new Error((res && res.error) || _("Update failed"));
                }
                return main.P99ShellMethods.waitSubscriptionUpdateJob(
                  res.data.job_id,
                );
              })
              .then(function (jobRes) {
                ui.hideIndicator("p99-updating-all");
                if (jobRes && jobRes.data && jobRes.data.failed) {
                  ui.addNotification(
                    null,
                    E("p", _("Subscription update failed")),
                    "error",
                  );
                } else {
                  ui.addNotification(
                    null,
                    E("p", _("All subscriptions updated successfully")),
                    "info",
                  );
                }
              })
              .catch(function (err) {
                ui.hideIndicator("p99-updating-all");
                ui.addNotification(
                  null,
                  E("p", err.message || _("Update failed")),
                  "error",
                );
              });
          },
        },
        _("Update all subscriptions"),
      ),
    ],
  );

  sectionRef.modaltitle = function (section_id) {
    const label =
      uci.get(UCI_PACKAGE, section_id, "label") ||
      getUrlHostname(uci.get(UCI_PACKAGE, section_id, "url"));
    return section_id
      ? `${_("Subscription")}: ${label || section_id}`
      : _("Add a subscription");
  };

  sectionRef.sectiontitle = function (section_id) {
    return (
      uci.get(UCI_PACKAGE, section_id, "label") ||
      getUrlHostname(uci.get(UCI_PACKAGE, section_id, "url")) ||
      section_id
    );
  };
}

function createSubscriptionsContent(section) {
  let o;

  // 1. Name / Label
  o = section.option(
    form.Value,
    "label",
    _("Name"),
    _(
      "Custom name for this subscription. If empty, the URL hostname will be used.",
    ),
  );
  o.placeholder = _("e.g. European Fast");
  o.rmempty = true;
  o.textvalue = function (section_id) {
    const label = uci.get(UCI_PACKAGE, section_id, "label");
    if (label) return label;
    const url = uci.get(UCI_PACKAGE, section_id, "url");
    return getUrlHostname(url) || section_id;
  };

  // 2. Subscription URL
  o = section.option(
    form.Value,
    "url",
    _("Subscription URL"),
    _("HTTP or HTTPS subscription link"),
  );
  o.rmempty = false;
  o.validate = function (_section_id, value) {
    return validateSubscriptionUrl(value);
  };

  // 3. Enabled
  o = section.option(form.Flag, "enabled", _("Enabled"));
  o.default = "1";
  o.rmempty = false;

  // 3b. Action: Update now
  o = section.option(form.Button, "_update_btn", _("Sync"));
  o.inputtitle = _("Update now");
  o.inputstyle = "apply";
  o.modalonly = false;
  o.onclick = function (ev, section_id) {
    ev.preventDefault();
    ev.stopPropagation();
    const btn = ev.target;
    if (btn) btn.setAttribute("disabled", "true");

    ui.showIndicator("p99-updating-sub", _("Updating subscription..."));

    return main.P99ShellMethods.subscriptionUpdateStart(section_id)
      .then(function (res) {
        if (!res || !res.success) {
          throw new Error((res && res.error) || _("Update failed"));
        }
        return main.P99ShellMethods.waitSubscriptionUpdateJob(res.data.job_id);
      })
      .then(function (jobRes) {
        ui.hideIndicator("p99-updating-sub");
        if (btn) btn.removeAttribute("disabled");
        if (jobRes && jobRes.data && jobRes.data.failed) {
          ui.addNotification(
            null,
            E("p", _("Subscription update failed")),
            "error",
          );
        } else {
          ui.addNotification(
            null,
            E("p", _("Subscription updated successfully")),
            "info",
          );
        }
      })
      .catch(function (err) {
        ui.hideIndicator("p99-updating-sub");
        if (btn) btn.removeAttribute("disabled");
        ui.addNotification(
          null,
          E("p", err.message || _("Subscription update failed")),
          "error",
        );
      });
  };

  // 4. Auto Update
  o = section.option(
    form.Flag,
    "subscription_update_enabled",
    _("Auto update"),
    _("Update this subscription automatically according to the interval"),
  );
  o.default = "1";
  o.rmempty = false;

  // 5. Update Interval
  o = section.option(
    form.Value,
    "subscription_update_interval",
    _("Update interval"),
    _("Use sing-box duration format like 1d, 12h or 30m"),
  );
  o.placeholder = "4h";
  o.default = "4h";
  o.depends("subscription_update_enabled", "1");
  o.validate = function (section_id, value) {
    const enabled = this.section.formvalue(
      section_id,
      "subscription_update_enabled",
    );
    if (enabled === "0") return true;
    const trimmed = `${value || ""}`.trim();
    if (!trimmed) return _("Update interval is required");
    if (!isSingBoxDuration(trimmed)) {
      return _("Expecting a valid duration string, e.g. 4h, 1d, 30m");
    }
    return true;
  };

  // 6. Show dashboard metadata (modal only)
  o = section.option(
    form.Flag,
    "show_dashboard_metadata",
    _("Show in dashboard"),
    _("Display subscription traffic and expiry information in the dashboard"),
  );
  o.modalonly = true;
  o.default = "1";
  o.rmempty = false;

  // 7. Node prefix (modal only)
  o = section.option(
    form.Value,
    "node_prefix",
    _("Add prefix to nodes"),
    _(
      "Automatically add text to the name of each server from this subscription for convenient filtering.",
    ),
  );
  o.modalonly = true;
  o.placeholder = _("e.g. MyVPN");
  o.rmempty = true;

  // 8. Import URLTest groups (modal only)
  o = section.option(
    form.Flag,
    "include_urltest_groups",
    _("Import URLTest groups"),
    _("Import URLTest groups returned by this subscription provider"),
  );
  o.modalonly = true;
  o.default = "1";
  o.rmempty = false;

  // 9. User Agent (modal only)
  o = section.option(
    form.Value,
    "user_agent",
    _("User-Agent"),
    _(
      "Leave empty for default (Happ/3.26.1) or specify e.g. sing-box, clash.meta, v2ray",
    ),
  );
  o.modalonly = true;
  o.placeholder = "Happ/3.26.1";
  o.rmempty = true;
}

const SubscriptionsModule = {
  configureSubscriptionsSection,
  createSubscriptionsContent,
};

return baseclass.extend(SubscriptionsModule);
