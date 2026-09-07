import { P99_UCI_PACKAGE, SECONDARY_RULESET_OPTIONS } from '../../../constants';
import { validateDNS } from '../../../validators/validateDns';
import { validateOutboundJson } from '../../../validators/validateOutboundJson';
import { validateProxyUrl } from '../../../validators/validateProxyUrl';
import {
  getDefaultOutboundDetourSection,
  getOutboundDetourTargetSections,
  getUciSectionName,
  refreshDnsDetourSectionOptionValues,
  refreshOutboundDetourSectionOptionValues,
} from '../../section/detours';
import { dnsTypeChoices } from '../../section/modalTabs';
import { makeDeviceOptionsExclusive } from '../../section/clientIsolation';
import {
  validateCustomRulesetReference,
  validatePlainListReference,
} from '../../section/rulesets';
import {
  ensureActionProvidersAvailabilityLoaded,
  isByedpiInstalledForUi,
  isZapret2InstalledForUi,
  isZapretInstalledForUi,
} from './availability';
import {
  childItemInputValue,
  childPendingSettingsStore,
  getBuiltInRulesetReferences,
  getChildItemIds,
  getConfigListValues,
  getCustomRulesetReferences,
  getSecondaryRulesetReferences,
  isExistingChildItem,
  outboundJsonListItemLabel,
  RULE_SET_ITEM_SETTINGS_KEY,
  validateSubscriptionUrlEntry,
  writeBuiltInRulesetReferences,
  writeCustomRulesetReferences,
  writeDnsRulesetReferences,
  writeListOption,
  writeSecondaryRulesetReferences,
} from './childItemsManager';
import {
  addDynamicConditionField,
  addLocalDeviceSubnetDynamicField,
  addTextConditionField,
  analyzeDomainSuffixText,
  analyzeIpCidrText,
  dependsOnRoutingAction,
  dependsOnRuleConditions,
  loadCombinedDomainText,
  loadRulesetValues,
  validatePortCondition,
} from './conditionFields';
import {
  analyzeByedpiStrategy,
  analyzeNfqws2Strategy,
  analyzeNfqwsStrategy,
  attachNfqws2RemoteValidation,
  attachNfqwsRemoteValidation,
  BYEDPI_DEFAULT_CMD_OPTS,
  normalizeByedpiStrategyValue,
  normalizeNfqws2StrategyValue,
  normalizeNfqwsStrategyValue,
  parseNfqws2StrategyOnSave,
  parseNfqwsStrategyOnSave,
  validateByedpiStrategyRemotely,
  validateNfqws2StrategyRemotely,
  validateNfqwsStrategyRemotely,
  ZAPRET_DEFAULT_NFQWS_OPT,
  ZAPRET_LEGACY_DEFAULT_NFQWS_OPT,
  ZAPRET2_DEFAULT_NFQWS2_OPT,
} from './dpiValidation';
import {
  addDashboardServerFilterOptions,
  ButtonAddSettingsDynamicList,
  currentLiveDynamicListValues,
  globalSubscriptionChoices,
  defaultInterfaceSettings,
  InterfaceSettingsDynamicList,
  optionMapValue,
  outboundNameSourceOptions,
  priorityGroupChildDefaults,
  randomPriorityGroupId,
  refreshDashboardFilterChoiceWidgets,
  refreshOptionChoices,
  sectionGroupSourceOptions,
  SettingsDynamicList,
  subscriptionUrlChildDefaults,
  urlTestChildDefaults,
  validateOutboundJsonItemsBeforeSave,
  validatePriorityGroupItemsBeforeSave,
  validateUrlTestItemsBeforeSave,
} from './itemOptions';
import { configureTextareaOption } from './annotatedTextarea';
import {
  showInterfaceSettingsModal,
  showOutboundJsonSettingsModal,
  showPriorityGroupSettingsModal,
  showRuleSetSettingsModal,
  showSubscriptionUrlSettingsModal,
  showUrlTestSettingsModal,
} from './settingsModals';

export function getRuleConfiguredAction(section_id: string): string | null {
  const action = uci.get(P99_UCI_PACKAGE, section_id, 'action');
  return action ? `${action}` : null;
}

export function getRuleResolvedAction(section_id: string): string {
  return getRuleConfiguredAction(section_id) || 'connection';
}

export function getActionOptionLabel(action: string): string {
  switch (`${action}`) {
    case 'block':
      return _('Block');
    case 'bypass':
      return _('Direct / Bypass');
    case 'connection':
      return _('Proxy (sing-box)');
    case 'dns':
      return 'DNS';
    case 'vpn':
      return 'VPN';
    case 'zapret':
      return 'Zapret (DPI)';
    case 'zapret2':
      return 'Zapret2 (DPI)';
    case 'byedpi':
      return 'ByeDPI';
    case 'outbound':
      return _('JSON outbound');
    case 'proxy':
    default:
      return 'Proxy';
  }
}

export function getRuleActionDisplayValue(section_id: string): string {
  const action = getRuleResolvedAction(section_id);

  if (action === 'zapret') {
    return 'Zapret';
  }

  if (action === 'zapret2') {
    return 'Zapret2';
  }

  if (action === 'byedpi') {
    return 'ByeDPI';
  }

  return getActionOptionLabel(action);
}

export function getRuleActionDisplayMarkup(section_id: string): string {
  return getRuleActionDisplayValue(section_id);
}

export function populateActionOptionValues(option: any): void {
  delete option.keylist;
  delete option.vallist;

  option.value('connection', getActionOptionLabel('connection'));
  option.value('bypass', getActionOptionLabel('bypass'));
  option.value('block', getActionOptionLabel('block'));
  option.value('dns', getActionOptionLabel('dns'));
  if (isZapretInstalledForUi()) {
    option.value('zapret', getActionOptionLabel('zapret'));
  }
  if (isZapret2InstalledForUi()) {
    option.value('zapret2', getActionOptionLabel('zapret2'));
  }
  if (isByedpiInstalledForUi()) {
    option.value('byedpi', getActionOptionLabel('byedpi'));
  }
}

export function createSectionContent(section: any): void {
  let o: any;

  section.tab('settings', _('General'));
  section.tab('conditions', _('Rules & Traffic'));
  section.tab('clients', _('Clients & Devices'));
  section.tab('advanced', _('Advanced'));

  o = section.taboption('settings', form.Flag, 'enabled', _('Enable'));
  o.default = '1';
  o.rmempty = false;
  o.editable = true;
  o.width = '6rem';

  o = section.taboption(
    'settings',
    form.DummyValue,
    '_action_display',
    _('Action'),
  );
  o.modalonly = false;
  o.rawhtml = true;
  o.cfgvalue = function (section_id: string) {
    return getRuleActionDisplayMarkup(section_id);
  };
  o.textvalue = function (section_id: string) {
    return getRuleActionDisplayValue(section_id);
  };
  o.width = '7rem';

  o = section.taboption(
    'settings',
    form.Value,
    'label',
    _('Section name'),
    _('Visible name of this section'),
  );
  o.rmempty = false;
  o.modalonly = true;
  o.load = function (section_id: string) {
    return uci.get(P99_UCI_PACKAGE, section_id, 'label') || section_id;
  };

  o = section.taboption(
    'settings',
    form.ListValue,
    'action',
    _('Action'),
    _('What P99 should do when this section matches'),
  );
  populateActionOptionValues(o);
  o.default = 'connection';
  o.rmempty = false;
  o.modalonly = true;
  o.cfgvalue = function (section_id: string) {
    return getRuleConfiguredAction(section_id);
  };
  o.load = function (this: any, section_id: string) {
    return ensureActionProvidersAvailabilityLoaded().then(() => {
      populateActionOptionValues(this);
      return this.cfgvalue(section_id);
    });
  };

  o = section.taboption(
    'settings',
    form.ListValue,
    'dns_type',
    _('DNS protocol'),
    _('DNS protocol used by the resolver'),
  );
  o.depends('action', 'dns');
  dnsTypeChoices().forEach((choice) => o.value(choice.value, choice.label));
  o.default = 'udp';
  o.rmempty = false;
  o.modalonly = true;

  o = section.taboption(
    'settings',
    form.Value,
    'dns_server',
    _('DNS server'),
    _('DNS server used by the resolver'),
  );
  o.depends('action', 'dns');
  o.rmempty = false;
  o.modalonly = true;
  o.validate = function (_section_id: unknown, value: unknown) {
    const normalized = `${value || ''}`.trim();
    if (!normalized) {
      return _('DNS server address cannot be empty');
    }
    const validation = validateDNS(normalized);
    return validation.valid ? true : _('Enter a valid DNS server address');
  };

  o = section.taboption(
    'advanced',
    form.Flag,
    'dns_detour_enabled',
    _('DNS through section'),
    _('Route requests to this DNS server through another section.'),
  );
  o.depends('action', 'dns');
  o.default = '0';
  o.rmempty = false;
  o.modalonly = true;

  o = section.taboption(
    'advanced',
    form.ListValue,
    'dns_detour_section',
    _('DNS requests through section'),
  );
  o.depends({ action: 'dns', dns_detour_enabled: '1' });
  o.rmempty = false;
  o.modalonly = true;
  o.load = function (this: any, section_id: string) {
    refreshDnsDetourSectionOptionValues(this, section_id);
    return uci.get(P99_UCI_PACKAGE, section_id, 'dns_detour_section') || '';
  };
  o.validate = function (_section_id: unknown, value: unknown) {
    return value ? true : _('Select a section');
  };

  o = section.taboption(
    'advanced',
    form.TextValue,
    'nfqws_opt',
    _('NFQWS Strategy'),
  );
  o.depends('action', 'zapret');
  o.rows = 6;
  o.wrap = 'soft';
  o.textarea = true;
  o.modalonly = true;
  o.load = function (section_id: string) {
    const value = uci.get(P99_UCI_PACKAGE, section_id, 'nfqws_opt');
    if (!value || value === ZAPRET_LEGACY_DEFAULT_NFQWS_OPT) {
      return ZAPRET_DEFAULT_NFQWS_OPT;
    }

    return value;
  };
  o.write = function (section_id: string, value: unknown) {
    const normalized = normalizeNfqwsStrategyValue(value);
    const nextValue =
      !normalized.length || normalized === ZAPRET_LEGACY_DEFAULT_NFQWS_OPT
        ? ZAPRET_DEFAULT_NFQWS_OPT
        : normalized;

    return validateNfqwsStrategyRemotely(nextValue).then((result) => {
      if (!result || result.valid !== true) {
        throw new TypeError(
          result && result.message
            ? result.message
            : _(
                'Unable to validate the NFQWS strategy through the backend parser.',
              ),
        );
      }

      uci.set(P99_UCI_PACKAGE, section_id, 'nfqws_opt', nextValue);
    });
  };
  o.validate = function (_section_id: unknown, value: unknown) {
    const analysis = analyzeNfqwsStrategy(value);
    return analysis.valid ? true : analysis.message;
  };
  o.parse = parseNfqwsStrategyOnSave;
  configureTextareaOption(o, analyzeNfqwsStrategy, attachNfqwsRemoteValidation);

  o = section.taboption(
    'advanced',
    form.TextValue,
    'nfqws2_opt',
    _('NFQWS2 Strategy'),
  );
  o.depends('action', 'zapret2');
  o.rows = 6;
  o.wrap = 'soft';
  o.textarea = true;
  o.modalonly = true;
  o.load = function (section_id: string) {
    return (
      uci.get(P99_UCI_PACKAGE, section_id, 'nfqws2_opt') ||
      ZAPRET2_DEFAULT_NFQWS2_OPT
    );
  };
  o.write = function (section_id: string, value: unknown) {
    const normalized = normalizeNfqws2StrategyValue(value);

    return validateNfqws2StrategyRemotely(normalized).then((result) => {
      if (!result || result.valid !== true) {
        throw new TypeError(
          result && result.message
            ? result.message
            : _('Invalid NFQWS2 strategy'),
        );
      }

      uci.set(P99_UCI_PACKAGE, section_id, 'nfqws2_opt', normalized);
    });
  };
  o.validate = function (_section_id: unknown, value: unknown) {
    const analysis = analyzeNfqws2Strategy(value);
    return analysis.valid ? true : analysis.message;
  };
  o.parse = parseNfqws2StrategyOnSave;
  configureTextareaOption(
    o,
    analyzeNfqws2Strategy,
    attachNfqws2RemoteValidation,
  );

  o = section.taboption(
    'advanced',
    form.TextValue,
    'byedpi_cmd_opts',
    _('ByeDPI Strategy'),
  );
  o.depends('action', 'byedpi');
  o.rows = 6;
  o.wrap = 'soft';
  o.textarea = true;
  o.modalonly = true;
  o.load = function (section_id: string) {
    return (
      uci.get(P99_UCI_PACKAGE, section_id, 'byedpi_cmd_opts') ||
      BYEDPI_DEFAULT_CMD_OPTS
    );
  };
  o.write = function (section_id: string, value: unknown) {
    const normalized = normalizeByedpiStrategyValue(value);

    return validateByedpiStrategyRemotely(normalized).then((result) => {
      if (!result || result.valid !== true) {
        throw new TypeError(
          result && result.message
            ? result.message
            : _('Invalid ByeDPI strategy'),
        );
      }

      uci.set(P99_UCI_PACKAGE, section_id, 'byedpi_cmd_opts', normalized);
    });
  };
  o.validate = function (_section_id: unknown, value: unknown) {
    const analysis = analyzeByedpiStrategy(value);
    return analysis.valid ? true : analysis.message;
  };
  configureTextareaOption(o, analyzeByedpiStrategy);

  o = section.taboption(
    'settings',
    form.DynamicList,
    'selector_proxy_links',
    _('Connection URL'),
    _(
      'vless://, vmess://, ss://, trojan://, socks4/5://, hy2/hysteria2:// links',
    ),
  );
  o.depends('action', 'connection');
  o.rmempty = true;
  o.modalonly = true;
  o.validate = function (_section_id: unknown, value: unknown) {
    if (!value || (value as string).length === 0) {
      return true;
    }

    const validation = validateProxyUrl(value as string);
    return validation.valid ? true : validation.message;
  };
  o.onchange = function (_event: unknown, section_id: string) {
    refreshDashboardFilterChoiceWidgets(section_id);
  };
  outboundNameSourceOptions.set('selector_proxy_links', o);

  o = section.taboption(
    'settings',
    SettingsDynamicList,
    'subscription_url',
    _('Subscription URL'),
    _(
      'Enter direct subscription URLs (mutually exclusive with pre-configured Subscriptions below)',
    ),
  );
  o.depends('action', 'connection');
  o.rmempty = true;
  o.modalonly = true;
  o.childType = 'subscription_url';
  o.childValueOption = 'url';
  o.childDefaults = subscriptionUrlChildDefaults();
  o.renderItemSettingsModal = showSubscriptionUrlSettingsModal;
  o.hasItemSettings = function (this: any, section_id: string, value: unknown) {
    const normalized = `${value || ''}`.trim();
    if (isExistingChildItem(section_id, normalized, 'subscription_url')) {
      return true;
    }

    return this.validate(section_id, normalized) === true;
  };
  o.stagedChildSettings = function (
    this: any,
    section_id: string,
    value: unknown,
  ) {
    const inputValue = childItemInputValue(
      section_id,
      value as string,
      'subscription_url',
      'url',
    );
    const store = childPendingSettingsStore(this, section_id);
    return store[inputValue] ? Object.assign({}, store[inputValue]) : null;
  };
  o.clearStagedChildSettings = function (this: any, section_id: string) {
    if (this.pendingChildSettings) {
      delete this.pendingChildSettings[section_id];
    }
  };

  function hasSelectedSubscriptions(option: any, section_id: string): boolean {
    const live = currentLiveDynamicListValues(section_id, 'subscription');
    if (live != null) {
      return live.length > 0;
    }
    const saved = optionMapValue(option, section_id, 'subscription');
    return Boolean(
      saved &&
        (Array.isArray(saved)
          ? saved.filter((v) => `${v || ''}`.trim() !== '').length > 0
          : `${saved}`.trim() !== ''),
    );
  }

  function hasDirectSubscriptionUrls(option: any, section_id: string): boolean {
    const live = currentLiveDynamicListValues(section_id, 'subscription_url');
    if (live != null) {
      return live.length > 0;
    }
    const childIds = getChildItemIds(section_id, 'subscription_url');
    if (childIds && childIds.length > 0) {
      return true;
    }
    const saved = optionMapValue(option, section_id, 'subscription_url');
    return Boolean(
      saved &&
        (Array.isArray(saved)
          ? saved.filter((v) => `${v || ''}`.trim() !== '').length > 0
          : `${saved}`.trim() !== ''),
    );
  }

  function triggerPeerValidation(section_id: string, optionName: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    const widget = document.getElementById(
      `cbid.${P99_UCI_PACKAGE}.${section_id}.${optionName}`,
    );
    if (!widget) {
      return;
    }
    widget.querySelectorAll('input, select').forEach((el) => {
      el.dispatchEvent(new Event('blur'));
    });
  }

  o.renderListItemLabel = function (section_id: string, itemId: string) {
    return childItemInputValue(section_id, itemId, 'subscription_url', 'url');
  };
  o.validate = function (this: any, section_id: string, value: unknown) {
    const rawValue = `${value || ''}`.trim();
    const normalizedValue = `${
      childItemInputValue(
        section_id,
        value as string,
        'subscription_url',
        'url',
      ) || ''
    }`.trim();

    if (!rawValue && !normalizedValue) {
      return true;
    }

    if (hasSelectedSubscriptions(this, section_id)) {
      return _(
        'Cannot use direct Subscription URLs when subscriptions are selected. Clear the Subscriptions field first.',
      );
    }

    return validateSubscriptionUrlEntry(section_id, normalizedValue);
  };
  o.onListChange = function (section_id: string) {
    triggerPeerValidation(section_id, 'subscription');
  };

  o = section.taboption(
    'settings',
    form.DynamicList,
    'subscription',
    _('Subscriptions'),
    _(
      'Select pre-configured subscriptions from the Subscriptions tab (mutually exclusive with direct Subscription URLs above)',
    ),
  );
  o.depends('action', 'connection');
  o.rmempty = true;
  o.modalonly = true;
  o.load = function (this: any, section_id: string) {
    refreshOptionChoices(this, globalSubscriptionChoices());
    return form.DynamicList.prototype.load.apply(this, [section_id]);
  };
  o.onchange = function (_event: unknown, section_id: string) {
    refreshDashboardFilterChoiceWidgets(section_id);
    triggerPeerValidation(section_id, 'subscription_url');
  };
  o.validate = function (this: any, section_id: string, value: unknown) {
    const rawValues = Array.isArray(value)
      ? value.map((v) => `${v || ''}`.trim()).filter(Boolean)
      : [`${value || ''}`.trim()].filter(Boolean);

    if (rawValues.length === 0) {
      return true;
    }

    if (hasDirectSubscriptionUrls(this, section_id)) {
      return _(
        'Cannot select subscriptions when direct Subscription URLs are configured. Clear the Subscription URL field first.',
      );
    }

    return true;
  };
  outboundNameSourceOptions.set('subscription', o);

  o = section.taboption(
    'settings',
    InterfaceSettingsDynamicList,
    'interfaces',
    _('Network Interface'),
    _('Select network interface for VPN connection'),
  );
  o.depends('action', 'connection');
  o.rmempty = true;
  o.modalonly = true;
  o.placeholder = _('Select a network interface');
  o.childType = 'section_interface';
  o.childValueOption = 'name';
  o.childDefaults = defaultInterfaceSettings();
  o.renderItemSettingsModal = showInterfaceSettingsModal;
  o.hasItemSettings = function (this: any, section_id: string, value: unknown) {
    const normalized = `${value || ''}`.trim();
    if (isExistingChildItem(section_id, normalized, 'section_interface')) {
      return true;
    }

    return this.validate(section_id, normalized) === true;
  };
  o.stagedChildSettings = function (
    this: any,
    section_id: string,
    value: unknown,
  ) {
    const inputValue = childItemInputValue(
      section_id,
      value as string,
      'section_interface',
      'name',
    );
    const store = childPendingSettingsStore(this, section_id);
    return store[inputValue] ? Object.assign({}, store[inputValue]) : null;
  };
  o.clearStagedChildSettings = function (this: any, section_id: string) {
    if (this.pendingChildSettings) {
      delete this.pendingChildSettings[section_id];
    }
  };
  o.onListChange = refreshDashboardFilterChoiceWidgets;
  outboundNameSourceOptions.set('interfaces', o);

  o = section.taboption(
    'advanced',
    ButtonAddSettingsDynamicList,
    'outbound_jsons',
    _('JSON outbound'),
    _('Custom outbound configurations in JSON format'),
  );
  o.depends('action', '__internal_hidden__');
  o.rmempty = true;
  o.modalonly = true;
  o.addButtonLabel = _('+ Add JSON outbound');
  o.renderItemSettingsModal = showOutboundJsonSettingsModal;
  o.renderListItemLabel = function (_section_id: string, value: unknown) {
    return outboundJsonListItemLabel(value);
  };
  o.validateItemsOnSave = validateOutboundJsonItemsBeforeSave;
  o.validate = function (_section_id: unknown, value: unknown) {
    if (!value || (value as string).length === 0) {
      return true;
    }

    const validation = validateOutboundJson(value as string);
    return validation.valid ? true : validation.message;
  };
  o.onListChange = refreshDashboardFilterChoiceWidgets;
  outboundNameSourceOptions.set('outbound_jsons', o);

  o = section.taboption(
    'settings',
    ButtonAddSettingsDynamicList,
    'urltest',
    _('URLTest'),
    _('Server group for automatic lowest-latency selection'),
  );
  o.depends('action', 'connection');
  o.rmempty = true;
  o.modalonly = true;
  o.addButtonLabel = _('+ Add URLTest');
  o.childType = 'urltest';
  o.childValueOption = 'name';
  o.childDefaults = urlTestChildDefaults();
  o.renderItemSettingsModal = showUrlTestSettingsModal;
  o.validateItemsOnSave = function (
    this: any,
    section_id: string,
    values: unknown,
  ) {
    return validateUrlTestItemsBeforeSave(section_id, values, this);
  };
  o.hasItemSettings = function (section_id: string, value: unknown) {
    const normalized = `${value || ''}`.trim();

    if (isExistingChildItem(section_id, normalized, 'urltest')) {
      return true;
    }

    return normalized.length > 0;
  };
  o.inputValueForItem = function (
    this: any,
    section_id: string,
    value: unknown,
  ) {
    const inputValue = childItemInputValue(
      section_id,
      value as string,
      'urltest',
      'name',
    );
    const store = childPendingSettingsStore(this, section_id);
    return store[inputValue] && (store[inputValue].name as string)
      ? (store[inputValue].name as string)
      : inputValue;
  };
  o.stagedChildSettings = function (
    this: any,
    section_id: string,
    value: unknown,
  ) {
    const id = childItemInputValue(
      section_id,
      value as string,
      'urltest',
      'name',
    );
    const store = childPendingSettingsStore(this, section_id);
    return store[id] ? Object.assign({}, store[id]) : null;
  };
  o.clearStagedChildSettings = function (this: any, section_id: string) {
    if (this.pendingChildSettings) {
      delete this.pendingChildSettings[section_id];
    }
  };
  o.renderListItemLabel = function (
    this: any,
    section_id: string,
    itemId: string,
  ) {
    return E(
      'span',
      { class: 'fkp-dynlist-label' },
      this.inputValueForItem(section_id, itemId),
    );
  };
  o.onListChange = refreshDashboardFilterChoiceWidgets;
  sectionGroupSourceOptions.set('urltest', o);

  o = section.taboption(
    'settings',
    ButtonAddSettingsDynamicList,
    'priority_group',
    _('Priority'),
    _('Server group for priority failover'),
  );
  o.depends('action', 'connection');
  o.rmempty = true;
  o.modalonly = true;
  o.addButtonLabel = _('+ Add priority');
  o.childType = 'priority_group';
  o.childValueOption = 'name';
  o.childDefaults = priorityGroupChildDefaults();
  o.createId = () => randomPriorityGroupId();
  o.renderItemSettingsModal = showPriorityGroupSettingsModal;
  o.validateItemsOnSave = validatePriorityGroupItemsBeforeSave;
  o.hasItemSettings = function (section_id: string, value: unknown) {
    const normalized = `${value || ''}`.trim();

    if (isExistingChildItem(section_id, normalized, 'priority_group')) {
      return true;
    }

    return normalized.length > 0;
  };
  o.inputValueForItem = function (section_id: string, value: unknown) {
    return childItemInputValue(
      section_id,
      value as string,
      'priority_group',
      'name',
    );
  };
  o.renderListItemLabel = function (
    this: any,
    section_id: string,
    itemId: string,
  ) {
    return E(
      'span',
      { class: 'fkp-dynlist-label' },
      this.inputValueForItem(section_id, itemId),
    );
  };
  o.onListChange = refreshDashboardFilterChoiceWidgets;
  sectionGroupSourceOptions.set('priority_group', o);

  o = section.taboption(
    'advanced',
    form.Flag,
    'outbound_detour_enabled',
    _('Cascade connection'),
    _(
      'Use another section as an intermediate hop to connect to servers in this section. Does not apply to network interfaces or JSON outbounds.',
    ),
  );
  o.default = '0';
  o.rmempty = false;
  o.depends('action', '__internal_hidden__');
  o.modalonly = true;
  o.write = function (this: any, section_id: string, value: unknown) {
    if (value === '1') {
      const currentValue =
        uci.get(P99_UCI_PACKAGE, section_id, 'outbound_detour_section') || '';
      const targetSections = getOutboundDetourTargetSections(section_id);
      const currentIsValid = targetSections.some(
        (targetSection) => getUciSectionName(targetSection) === currentValue,
      );
      const selectedValue = currentIsValid
        ? currentValue
        : getDefaultOutboundDetourSection(section_id);

      if (selectedValue) {
        uci.set(
          P99_UCI_PACKAGE,
          section_id,
          'outbound_detour_section',
          selectedValue,
        );
      }
    }

    return form.Flag.prototype.write.apply(this, [section_id, value]);
  };

  o = section.taboption(
    'advanced',
    form.ListValue,
    'outbound_detour_section',
    _('Connect through'),
    _('Select a transit section'),
  );
  o.rmempty = false;
  o.depends({ action: '__internal_hidden__', outbound_detour_enabled: '1' });
  o.modalonly = true;
  o.load = function (this: any, section_id: string) {
    refreshOutboundDetourSectionOptionValues(this, section_id);
    return Promise.resolve(
      uci.get(P99_UCI_PACKAGE, section_id, 'outbound_detour_section') || '',
    );
  };
  o.validate = function (section_id: string, value: unknown) {
    if (!value) {
      return _('Select an intermediate section');
    }
    if (value === section_id) {
      return _('Current section cannot be used as its own transit section');
    }
    return true;
  };

  o = section.taboption(
    'advanced',
    form.Flag,
    'sort_by_latency',
    _('Sort by latency'),
    _('Sorts servers in this section by lowest latency in the dashboard.'),
  );
  o.default = '0';
  o.rmempty = false;
  o.depends('action', '__internal_hidden__');
  o.modalonly = true;

  o = section.taboption(
    'clients',
    form.Flag,
    'mixed_proxy_enabled',
    _('Enable Mixed Proxy'),
    _('Expose this section as a local HTTP+SOCKS proxy'),
  );
  o.default = '0';
  o.rmempty = false;
  o.depends('action', 'byedpi');
  o.depends('action', 'zapret');
  o.depends('action', 'zapret2');
  o.modalonly = true;

  o = section.taboption(
    'clients',
    form.Value,
    'mixed_proxy_port',
    _('Mixed Proxy Port'),
    _('Port for the local mixed proxy of this section'),
  );
  o.rmempty = false;
  o.depends({ action: 'byedpi', mixed_proxy_enabled: '1' });
  o.depends({ action: 'zapret', mixed_proxy_enabled: '1' });
  o.depends({ action: 'zapret2', mixed_proxy_enabled: '1' });
  o.modalonly = true;
  o.validate = function (_section_id: unknown, value: unknown) {
    if (!value || (value as string).length === 0) {
      return _('Port cannot be empty');
    }

    const parsed = parseInt(value as string, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 65535) {
      return true;
    }

    return _('Invalid port number. Must be between 1 and 65535');
  };

  o = section.taboption(
    'clients',
    form.Flag,
    'mixed_proxy_auth_enabled',
    _('Enable Mixed Proxy Authentication'),
    _('Require a username and password for the local mixed proxy'),
  );
  o.default = '0';
  o.rmempty = false;
  o.depends({ action: 'byedpi', mixed_proxy_enabled: '1' });
  o.depends({ action: 'zapret', mixed_proxy_enabled: '1' });
  o.depends({ action: 'zapret2', mixed_proxy_enabled: '1' });
  o.modalonly = true;

  o = section.taboption(
    'clients',
    form.Value,
    'mixed_proxy_username',
    _('Mixed Proxy Username'),
  );
  o.rmempty = false;
  o.depends({
    action: 'byedpi',
    mixed_proxy_enabled: '1',
    mixed_proxy_auth_enabled: '1',
  });
  o.depends({
    action: 'zapret',
    mixed_proxy_enabled: '1',
    mixed_proxy_auth_enabled: '1',
  });
  o.depends({
    action: 'zapret2',
    mixed_proxy_enabled: '1',
    mixed_proxy_auth_enabled: '1',
  });
  o.modalonly = true;
  o.validate = function (_section_id: unknown, value: unknown) {
    if (!value || (value as string).length === 0) {
      return _('Username cannot be empty');
    }

    return true;
  };

  o = section.taboption(
    'clients',
    form.Value,
    'mixed_proxy_password',
    _('Mixed Proxy Password'),
  );
  o.rmempty = false;
  o.depends({
    action: 'byedpi',
    mixed_proxy_enabled: '1',
    mixed_proxy_auth_enabled: '1',
  });
  o.depends({
    action: 'zapret',
    mixed_proxy_enabled: '1',
    mixed_proxy_auth_enabled: '1',
  });
  o.depends({
    action: 'zapret2',
    mixed_proxy_enabled: '1',
    mixed_proxy_auth_enabled: '1',
  });
  o.modalonly = true;
  o.validate = function (_section_id: unknown, value: unknown) {
    if (!value || (value as string).length === 0) {
      return _('Password cannot be empty');
    }

    return true;
  };

  o = section.taboption(
    'advanced',
    form.Flag,
    'resolve_real_ip_for_routing',
    _('Resolve real IP for routing'),
    _(
      'Resolve domain names before routing so sing-box can use real destination IPs.',
    ),
  );
  o.default = '0';
  o.rmempty = false;
  o.depends('action', '__internal_hidden__');
  o.modalonly = true;
  o.cfgvalue = function (section_id: string) {
    const value = uci.get(
      P99_UCI_PACKAGE,
      section_id,
      'resolve_real_ip_for_routing',
    );
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }

    return getRuleResolvedAction(section_id) === 'byedpi' ? '1' : '0';
  };

  addTextConditionField(section, {
    key: 'domain_suffix',
    optionName: 'domain',
    legacyTextOptionName: 'domain_suffix_text',
    label: _('Domains'),
    description: _(
      'The rule applies to the domain and all its subdomains. Use full:, keyword:, or regex: prefixes for exact match, keyword match, or regular expression.',
    ),
    textAnalyze: analyzeDomainSuffixText,
    loadText: loadCombinedDomainText,
    afterWrite: function (section_id: string) {
      [
        'domain_suffix',
        'domain_suffix_text',
        'domain_suffix_text_mode',
        'domain_keyword',
        'domain_regex',
        'domain_text',
        'domain_keyword_text',
        'domain_regex_text',
        'domain_text_mode',
        'domain_keyword_text_mode',
        'domain_regex_text_mode',
      ].forEach((key) => {
        uci.unset(P99_UCI_PACKAGE, section_id, key);
      });
    },
  });

  const ipConditionOption = addTextConditionField(section, {
    key: 'ip_cidr',
    optionName: 'ip_cidr',
    legacyTextOptionName: 'ip_cidr_text',
    label: _('IPs'),
    description: _('Match destination IPs or subnets'),
    textAnalyze: analyzeIpCidrText,
  });
  dependsOnRoutingAction(ipConditionOption);

  const builtInRulesetOption = section.taboption(
    'conditions',
    form.DynamicList,
    'community_lists',
    _('Built-in rule sets'),
    _('Select a predefined domain list'),
  );
  builtInRulesetOption.modalonly = true;
  builtInRulesetOption.placeholder = _('Service list');
  builtInRulesetOption.load = function (this: any, section_id: string) {
    loadRulesetValues(this);
    return getBuiltInRulesetReferences(section_id);
  };
  builtInRulesetOption.write = function (section_id: string, values: unknown) {
    writeBuiltInRulesetReferences(section_id, values);
  };
  builtInRulesetOption.remove = function (section_id: string) {
    uci.unset(P99_UCI_PACKAGE, section_id, 'community_lists');
  };

  const secondaryRulesetOption = section.taboption(
    'conditions',
    form.DynamicList,
    'secondary_rule_sets',
    `${_('Built-in rule sets')} #2`,
    _('Select a predefined IP rule set from b4geoip-p99'),
  );
  secondaryRulesetOption.modalonly = true;
  secondaryRulesetOption.placeholder = _('Service list');
  secondaryRulesetOption.load = function (this: any, section_id: string) {
    refreshOptionChoices(
      this,
      Object.entries(SECONDARY_RULESET_OPTIONS || {}).map(([value, label]) => ({
        value,
        label,
      })),
    );
    return getSecondaryRulesetReferences(section_id);
  };
  secondaryRulesetOption.write = function (
    section_id: string,
    values: unknown,
  ) {
    writeSecondaryRulesetReferences(section_id, values);
  };
  secondaryRulesetOption.remove = function (section_id: string) {
    writeSecondaryRulesetReferences(section_id, []);
  };

  const ruleSetOption = section.taboption(
    'conditions',
    SettingsDynamicList,
    'rule_set',
    _('Rule sets'),
    _(
      'Add URLs or local paths to .srs / .json lists. Subnets are ignored by default.',
    ),
  );
  ruleSetOption.modalonly = true;
  // Both widgets map to rule_set, so neither inactive view may erase shared storage.
  ruleSetOption.retain = true;
  dependsOnRoutingAction(ruleSetOption);
  ruleSetOption.renderItemSettingsModal = showRuleSetSettingsModal;
  ruleSetOption.load = function (section_id: string) {
    return getCustomRulesetReferences(section_id);
  };
  ruleSetOption.write = function (section_id: string, value: unknown) {
    writeCustomRulesetReferences(section_id, value);
  };
  ruleSetOption.remove = function (section_id: string) {
    uci.unset(P99_UCI_PACKAGE, section_id, 'rule_set');
    writeListOption(
      section_id,
      'rule_set_with_subnets',
      getConfigListValues(section_id, 'rule_set_with_subnets').filter((value) =>
        Boolean(value),
      ),
    );
    uci.unset(P99_UCI_PACKAGE, section_id, RULE_SET_ITEM_SETTINGS_KEY);
  };
  ruleSetOption.validate = function (_section_id: unknown, value: unknown) {
    return validateCustomRulesetReference(value as string);
  };

  const dnsRuleSetOption = section.taboption(
    'conditions',
    form.DynamicList,
    '_dns_rule_set',
    _('Rule sets'),
    _(
      'Add URLs or local paths to .srs / .json lists. Only domain rules are supported.',
    ),
  );
  dnsRuleSetOption.depends('action', 'dns');
  dnsRuleSetOption.modalonly = true;
  dnsRuleSetOption.retain = true;
  dnsRuleSetOption.load = function (section_id: string) {
    return getCustomRulesetReferences(section_id);
  };
  dnsRuleSetOption.write = function (section_id: string, value: unknown) {
    writeDnsRulesetReferences(section_id, value);
  };
  dnsRuleSetOption.remove = function (section_id: string) {
    writeDnsRulesetReferences(section_id, []);
  };
  dnsRuleSetOption.validate = function (_section_id: unknown, value: unknown) {
    return validateCustomRulesetReference(value as string);
  };

  const domainIpListsOption = section.taboption(
    'conditions',
    form.DynamicList,
    'domain_ip_lists',
    _('Domain and IP lists'),
    _('Add URLs or local paths to .lst lists containing domains and subnets.'),
  );
  domainIpListsOption.modalonly = true;
  // Both widgets map to domain_ip_lists, so neither inactive view may erase shared storage.
  domainIpListsOption.retain = true;
  dependsOnRoutingAction(domainIpListsOption);
  domainIpListsOption.load = function (section_id: string) {
    return getConfigListValues(section_id, 'domain_ip_lists');
  };
  domainIpListsOption.write = function (section_id: string, value: unknown) {
    writeListOption(section_id, 'domain_ip_lists', value);
  };
  domainIpListsOption.validate = function (
    _section_id: unknown,
    value: unknown,
  ) {
    return validatePlainListReference(value as string);
  };

  const dnsDomainListsOption = section.taboption(
    'conditions',
    form.DynamicList,
    '_dns_domain_ip_lists',
    _('Domain lists'),
    _(
      'Add URLs or local paths to .lst lists containing domains. IP entries are ignored.',
    ),
  );
  dnsDomainListsOption.depends('action', 'dns');
  dnsDomainListsOption.modalonly = true;
  dnsDomainListsOption.retain = true;
  dnsDomainListsOption.load = function (section_id: string) {
    return getConfigListValues(section_id, 'domain_ip_lists');
  };
  dnsDomainListsOption.write = function (section_id: string, value: unknown) {
    writeListOption(section_id, 'domain_ip_lists', value);
  };
  dnsDomainListsOption.remove = function (section_id: string) {
    uci.unset(P99_UCI_PACKAGE, section_id, 'domain_ip_lists');
  };
  dnsDomainListsOption.validate = function (
    _section_id: unknown,
    value: unknown,
  ) {
    return validatePlainListReference(value as string);
  };

  const sourceIpOption = addLocalDeviceSubnetDynamicField(section, {
    key: 'source_ip_cidr',
    label: _('Device filter'),
    description: _(
      'Apply section rules only to the specified local IP addresses',
    ),
  });
  dependsOnRuleConditions(sourceIpOption);

  const fullyRoutedOption = addLocalDeviceSubnetDynamicField(section, {
    key: 'fully_routed_ips',
    label: _('Forced device routing'),
    description: _(
      'All traffic from these IP addresses will be routed through the section unconditionally, ignoring all other conditions.',
    ),
  });
  dependsOnRoutingAction(fullyRoutedOption);
  fullyRoutedOption.depends('action', 'dns');

  const excludedSourcesOption = addLocalDeviceSubnetDynamicField(section, {
    key: 'excluded_source_ip_cidr',
    label: _('Exclude devices'),
    description: _(
      'Do not apply this section to the specified local IP addresses; matching continues with the next section.',
    ),
  });
  dependsOnRoutingAction(excludedSourcesOption);
  excludedSourcesOption.depends('action', 'dns');
  makeDeviceOptionsExclusive(
    sourceIpOption,
    fullyRoutedOption,
    excludedSourcesOption,
  );

  const portsOption = addDynamicConditionField(section, {
    key: 'ports',
    label: _('Ports'),
    description: _('Match destination ports. Use a single port or a range'),
    dynamicValidate: validatePortCondition,
  });
  dependsOnRoutingAction(portsOption);

  addDashboardServerFilterOptions(section);
}

export {
  configureSectionSection,
  loadSectionTableOptions,
} from './sectionConfig';
