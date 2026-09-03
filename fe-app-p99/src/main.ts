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
  DNS_SERVER_OPTIONS,
  DOMAIN_LIST_OPTIONS,
  SECONDARY_RULESET_OPTIONS,
  LATENCY_TEST_URL_OPTIONS,
  P99_ACTION_PROVIDERS_AVAILABILITY_EVENT,
  P99_UCI_PACKAGE,
} from './constants';
