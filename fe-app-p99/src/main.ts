'use strict';
'require baseclass';
'require fs';
'require uci';
'require ui';

if (typeof structuredClone !== 'function')
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));

export { validateIP } from './validators/validateIp';
export { validateDomain } from './validators/validateDomain';
export { validateDNS } from './validators/validateDns';
export { validateUrl } from './validators/validateUrl';
export { validatePath } from './validators/validatePath';
export { validateSubnet } from './validators/validateSubnet';
export { bulkValidate } from './validators/bulkValidate';
export { validateOutboundJson } from './validators/validateOutboundJson';
export { validateProxyUrl } from './validators/validateProxyUrl';
export { parseValueList } from './helpers/parseValueList';
export { getProxyUrlName } from './helpers/getProxyUrlName';
export { injectGlobalStyles } from './helpers/injectGlobalStyles';
export { showToast } from './helpers/showToast';
export { getClashUIUrl } from './helpers/getClashApiUrl';
export { P99ShellMethods } from './p99/methods/shell';
export { coreService } from './p99/services/core.service';
export { store } from './p99/services/store.service';
export { applyUiStateToStore } from './p99/services/uiState.service';
export { DashboardTab } from './p99/tabs/dashboard';
export { DiagnosticTab } from './p99/tabs/diagnostic';
export { MonitoringTab } from './p99/tabs/monitoring';
export { UpdatesTab } from './p99/tabs/updates';
export {
  BOOTSTRAP_DNS_SERVER_OPTIONS,
  DEFAULT_LATENCY_TEST_URL,
  DEFAULT_LATENCY_TEST_TIMEOUT,
  DEFAULT_SHARED_LATENCY_POOL,
  DEFAULT_SHARED_LATENCY_INTERVAL,
  DNS_SERVER_OPTIONS,
  DOMAIN_LIST_OPTIONS,
  SECONDARY_RULESET_OPTIONS,
  LATENCY_TEST_URL_OPTIONS,
  P99_ACTION_PROVIDERS_AVAILABILITY_EVENT,
  P99_UCI_PACKAGE,
} from './constants';
export {
  isSingBoxDuration,
  validateOptionalSingBoxDuration,
  validateRequiredSingBoxDuration,
} from './p99/section/duration';
export {
  getNfqwsOptionArgumentMode,
  getNfqws2OptionArgumentMode,
  normalizeNfqwsStrategyWhitespace,
  normalizeNfqws2StrategyValue,
  normalizeByedpiStrategyWhitespace,
  normalizeByedpiStrategyValue,
  getNfqwsForbiddenTokenInfo,
  getNfqws2ForbiddenTokenInfo,
  byedpiTokenLooksLikeOption,
  getByedpiShortOptionName,
  getByedpiControlledTokenInfo,
  NFQWS_REQUIRED_ARG_OPTIONS,
  NFQWS_OPTIONAL_ARG_OPTIONS,
  NFQWS_NO_ARG_OPTIONS,
  NFQWS2_REQUIRED_ARG_OPTIONS,
  NFQWS2_OPTIONAL_ARG_OPTIONS,
  NFQWS2_NO_ARG_OPTIONS,
  BYEDPI_LONG_VALUE_OPTIONS,
  BYEDPI_LONG_FLAG_OPTIONS,
  BYEDPI_SHORT_VALUE_OPTIONS,
  BYEDPI_SHORT_FLAG_OPTIONS,
} from './p99/section/dpiStrategies';
export {
  secondaryRulesetUrl,
  secondaryRulesetId,
  isBuiltinRulesetValue,
  normalizeReferenceForExtensionCheck,
  hasAllowedReferenceExtension,
  validateFileReference,
  validateCustomRulesetReference,
  validatePlainListReference,
  SECONDARY_RULESET_RAW_PREFIX,
  SECONDARY_RULESET_CDN_PREFIX,
} from './p99/section/rulesets';
export {
  normalizeDynamicListItems,
  uniqueDynamicListItems,
  childOwnerOption,
  childItemOrder,
  compactItemSettings,
  cleanFormSectionData,
} from './p99/section/childItems';
export {
  parseCommentAwareListTokens,
  uniqueDomainTextValues,
  parseDomainTokenPrefix,
} from './p99/section/textListAnalysis';
