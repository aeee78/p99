import {
  BOOTSTRAP_DNS_SERVER_OPTIONS,
  DEFAULT_LATENCY_TEST_TIMEOUT,
  DEFAULT_LATENCY_TEST_URL,
  DNS_SERVER_OPTIONS,
} from '../../../constants';
import { getClashUIUrl } from '../../../helpers/getClashApiUrl';
import { isSingBoxDuration } from '../../section/duration';
import { configureDnsDuration, configureDnsList } from './dnsSettings';
import {
  configureDownloadSectionOption,
  configureDownloadViaProxyFlag,
} from './downloadSection';
import {
  latencyTestUrlChoices,
  validateLatencyTestUrl,
} from './latencySettings';
import type { LuciOption, LuciSection, UiCapabilities } from './types';

export function createSettingsContent(
  section: LuciSection,
  capabilities?: UiCapabilities,
): void {
  const formVal =
    typeof form !== 'undefined' ? form.Value : (class {} as FormOptionClass);
  const formList =
    typeof form !== 'undefined'
      ? form.ListValue
      : (class {} as FormOptionClass);

  const deviceSelectClass =
    typeof widgets !== 'undefined' ? widgets.DeviceSelect : formVal;
  const networkSelectClass =
    typeof widgets !== 'undefined' ? widgets.NetworkSelect : formVal;

  let o: LuciOption = section.option(
    formList,
    'dns_type',
    _('DNS Protocol Type'),
    _('Select DNS protocol to use'),
  );
  o.value('doh', _('DNS over HTTPS (DoH)'));
  o.value('dot', _('DNS over TLS (DoT)'));
  o.value('udp', _('UDP (Unprotected DNS)'));
  o.default = 'udp';
  o.rmempty = false;

  const dnsOption = section.option(
    form.DynamicList,
    'dns_server',
    _('DNS Servers'),
    _(
      'Main DNS server. If multiple servers are selected, a timeout switches to a backup.',
    ),
  );
  configureDnsList(dnsOption, DNS_SERVER_OPTIONS, '77.88.8.8');

  const bootstrapOption = section.option(
    form.DynamicList,
    'bootstrap_dns_server',
    _('Bootstrap DNS Servers'),
    _(
      'DNS server used to obtain IP addresses for upstream DNS and proxies. If multiple servers are selected, a timeout switches to a backup.',
    ),
  );
  configureDnsList(bootstrapOption, BOOTSTRAP_DNS_SERVER_OPTIONS, '77.88.8.8');

  o = section.option(
    form.Value,
    'dns_check_interval',
    _('DNS Check Interval'),
    _('How often to check the active DNS servers.'),
  );
  configureDnsDuration(o, '10s', dnsOption, bootstrapOption);

  o = section.option(
    form.Value,
    'dns_recovery_check_interval',
    _('Higher-priority DNS Check'),
    _('How often to check whether a higher-priority DNS server has recovered.'),
  );
  configureDnsDuration(o, '60s', dnsOption, bootstrapOption);

  o = section.option(
    form.Value,
    'dns_check_timeout',
    _('DNS Unavailability Timeout'),
    _(
      'Maximum time to wait for example.com to resolve during a DNS health check.',
    ),
  );
  configureDnsDuration(o, '2s', dnsOption, bootstrapOption);

  o = section.option(
    form.Value,
    'dns_rewrite_ttl',
    _('DNS Rewrite TTL'),
    _('Time in seconds for DNS record caching (default: 60)'),
  );
  o.default = '60';
  o.rmempty = false;
  o.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const str = `${value ?? ''}`.trim();
    if (!str) {
      return _('TTL value cannot be empty');
    }

    const ttl = parseInt(str, 10);
    if (isNaN(ttl) || ttl < 0) {
      return _('TTL must be a positive number');
    }

    return true;
  };

  o = section.option(form.ListValue, 'dns_strategy', _('DNS Strategy'));
  o.value('prefer_ipv4', _('Prefer IPv4'));
  o.value('ipv4_only', _('IPv4 only'));
  o.value('prefer_ipv6', _('Prefer IPv6'));
  o.value('ipv6_only', _('IPv6 only'));
  o.default = 'prefer_ipv4';
  o.rmempty = false;

  o = section.option(
    form.Flag,
    'dns_detour_enabled',
    _('DNS through proxy'),
    _('Route main DNS requests through the selected section.'),
  );
  configureDownloadViaProxyFlag(o, 'dns_detour_section');

  o = section.option(
    form.ListValue,
    'dns_detour_section',
    _('DNS requests through section'),
  );
  o.depends('dns_detour_enabled', '1');
  configureDownloadSectionOption(o, 'dns_detour_section', capabilities);

  o = section.option(
    deviceSelectClass,
    'source_network_interfaces',
    _('Source Network Interface'),
    _('Select the network interface from which the traffic will originate'),
  );
  o.default = 'br-lan';
  o.noaliases = true;
  o.nobridges = false;
  o.noinactive = false;
  o.multiple = true;
  o.filter = function (
    this: LuciOption,
    _section_id: string,
    value: string,
  ): boolean {
    const blocked = ['wan', 'phy0-ap0', 'phy1-ap0', 'pppoe-wan'];
    if (blocked.includes(value)) {
      return false;
    }

    const device = this.devices?.find((dev) => dev.getName() === value);
    if (!device) {
      return true;
    }

    const type = device.getType();
    const isWireless =
      type === 'wifi' || type === 'wireless' || type.includes('wlan');

    return !isWireless;
  };

  o = section.option(
    form.Flag,
    'enable_output_network_interface',
    _('Enable Output Network Interface'),
    _('You can select Output Network Interface, by default autodetect'),
  );
  o.default = '0';
  o.rmempty = false;

  o = section.option(
    deviceSelectClass,
    'output_network_interface',
    _('Output Network Interface'),
    _('Select the network interface to which the traffic will originate'),
  );
  o.noaliases = true;
  o.multiple = false;
  o.depends('enable_output_network_interface', '1');
  o.filter = function (
    this: LuciOption,
    _section_id: string,
    value: string,
  ): boolean {
    const blockedInterfaces = ['br-lan'];
    if (blockedInterfaces.includes(value)) {
      return false;
    }

    if (value.startsWith('lan')) {
      return false;
    }

    if (
      value.startsWith('tun') ||
      value.startsWith('wg') ||
      value.startsWith('vpn') ||
      value.startsWith('awg') ||
      value.startsWith('oc')
    ) {
      return false;
    }

    const device = this.devices?.find((dev) => dev.getName() === value);
    if (!device) {
      return true;
    }

    const type = device.getType();
    const isWireless =
      type === 'wifi' || type === 'wireless' || type.includes('wlan');

    return !isWireless;
  };

  o = section.option(
    form.Flag,
    'enable_badwan_interface_monitoring',
    _('Interface Monitoring'),
    _('Interface monitoring for Bad WAN'),
  );
  o.default = '0';
  o.rmempty = false;

  o = section.option(
    networkSelectClass,
    'badwan_monitored_interfaces',
    _('Monitored Interfaces'),
    _('Select the WAN interfaces to be monitored'),
  );
  o.depends('enable_badwan_interface_monitoring', '1');
  o.multiple = true;
  o.filter = function (
    this: LuciOption,
    _section_id: string,
    value: string,
  ): boolean {
    if (['lan', 'loopback'].includes(value)) {
      return false;
    }
    if (value.startsWith('@')) {
      return false;
    }
    return true;
  };

  o = section.option(
    form.Value,
    'badwan_reload_delay',
    _('Interface Monitoring Delay'),
    _('Delay in milliseconds before reloading P99 after interface UP'),
  );
  o.depends('enable_badwan_interface_monitoring', '1');
  o.default = '2000';
  o.rmempty = false;
  o.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const str = `${value ?? ''}`.trim();
    if (!str) {
      return _('Delay value cannot be empty');
    }
    return true;
  };

  o = section.option(
    form.Flag,
    'enable_yacd',
    _('Enable YACD'),
    `<a href="${getClashUIUrl()}" target="_blank">${getClashUIUrl()}</a>`,
  );
  o.default = '0';
  o.rmempty = false;

  o = section.option(
    form.Flag,
    'enable_yacd_wan_access',
    _('Enable YACD WAN Access'),
    _(
      'Allows access to YACD from the WAN. Make sure to open the appropriate port in your firewall.',
    ),
  );
  o.depends('enable_yacd', '1');
  o.default = '0';
  o.rmempty = false;

  o = section.option(
    form.Value,
    'yacd_secret_key',
    _('YACD Secret Key'),
    _(
      'Secret key for authenticating remote access to YACD when WAN access is enabled.',
    ),
  );
  o.depends('enable_yacd_wan_access', '1');
  o.rmempty = false;

  o = section.option(
    form.Flag,
    'disable_quic',
    _('Disable QUIC'),
    _(
      'Disable the QUIC protocol to improve compatibility or fix issues with video streaming',
    ),
  );
  o.default = '1';
  o.rmempty = false;

  o = section.option(
    form.Flag,
    'list_update_enabled',
    _('Enable list updates'),
    _('Enable automatic updates for remote lists and rule sets'),
  );
  o.default = '1';
  o.rmempty = false;

  o = section.option(
    form.Value,
    'update_interval',
    _('List Update Frequency'),
    _('Use sing-box duration format like 1d, 12h or 30m'),
  );
  o.depends('list_update_enabled', '1');
  o.placeholder = '1d';
  o.default = '1d';
  o.rmempty = false;
  o.cfgvalue = function (section_id: string): string {
    return (uci.get('p99', section_id, 'update_interval') as string) || '1d';
  };
  o.write = function (section_id: string, value: unknown): void {
    const normalized = value ? `${value}`.trim() : '';
    uci.set(
      'p99',
      section_id,
      'update_interval',
      normalized.length ? normalized : '1d',
    );
  };
  o.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const normalized = value ? `${value}`.trim() : '';
    if (!normalized.length || !isSingBoxDuration(normalized)) {
      return _('Use sing-box duration format like 1d, 12h or 30m');
    }
    return true;
  };

  o = section.option(
    form.Flag,
    'component_update_check_enabled',
    _('Automatic component update checks'),
    _('Automatically check installed components for new versions'),
  );
  o.default = '0';
  o.rmempty = false;

  o = section.option(
    form.Value,
    'component_update_check_interval',
    _('Component update check interval'),
    _('Use sing-box duration format like 1d, 12h or 30m'),
  );
  o.depends('component_update_check_enabled', '1');
  o.placeholder = '1d';
  o.default = '1d';
  o.rmempty = false;
  o.cfgvalue = function (section_id: string): string {
    return (
      (uci.get(
        'p99',
        section_id,
        'component_update_check_interval',
      ) as string) || '1d'
    );
  };
  o.write = function (section_id: string, value: unknown): void {
    const normalized = value ? `${value}`.trim() : '';
    uci.set(
      'p99',
      section_id,
      'component_update_check_interval',
      normalized.length ? normalized : '1d',
    );
  };
  o.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const normalized = value ? `${value}`.trim() : '';
    if (normalized.length && isSingBoxDuration(normalized)) {
      return true;
    }
    return _('Use sing-box duration format like 1d, 12h or 30m');
  };

  o = section.option(
    form.Value,
    'latency_test_url',
    _('Latency test URL'),
    _(
      'Default address for checking server availability and latency. URLTest uses its own address.',
    ),
  );
  latencyTestUrlChoices().forEach((val) => o.value(val));
  o.default =
    DEFAULT_LATENCY_TEST_URL || 'https://www.gstatic.com/generate_204';
  o.rmempty = false;
  o.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    return validateLatencyTestUrl(value);
  };

  o = section.option(
    form.Value,
    'latency_test_timeout',
    _('Latency test timeout (ms)'),
    _(
      'Maximum wait time in milliseconds for server ping and latency tests. Default is 2000 ms.',
    ),
  );
  o.datatype = 'uinteger';
  o.placeholder = '2000';
  o.default = String(DEFAULT_LATENCY_TEST_TIMEOUT || '2000');
  o.rmempty = false;
  o.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const normalized = value ? `${value}`.trim() : '';
    if (!/^[0-9]+$/.test(normalized)) {
      return _('Enter a number between 100 and 60000 ms');
    }
    const val = parseInt(normalized, 10);
    if (val < 100 || val > 60000) {
      return _('Enter a number between 100 and 60000 ms');
    }
    return true;
  };

  o = section.option(
    form.Flag,
    'shared_latency_pool',
    _('Shared latency pool for subscriptions'),
    _(
      'Pings all subscription proxy nodes once globally on a shared schedule instead of creating separate ping timers per section. Sections independently select their fastest alive node.',
    ),
  );
  o.default = '0';
  o.rmempty = false;

  o = section.option(
    form.Value,
    'shared_latency_interval',
    _('Shared latency test interval'),
    _(
      'Interval between automatic latency checks in the shared pool (e.g., 20m, 1h). Default is 20m.',
    ),
  );
  o.placeholder = '20m';
  o.default = '20m';
  o.depends('shared_latency_pool', '1');
  o.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const normalized = value ? `${value}`.trim() : '';
    if (!normalized) return true;
    if (!/^[0-9]+(\.[0-9]+)?(ns|us|ms|s|m|h|d)$/.test(normalized)) {
      return _('Enter a valid duration (e.g. 20m, 1h, 30s)');
    }
    return true;
  };

  o = section.option(
    form.Flag,
    'download_lists_via_proxy',
    _('Download lists through a section'),
    _('Download remote lists and rule sets via the selected section'),
  );
  configureDownloadViaProxyFlag(o, 'download_lists_via_proxy_section');

  o = section.option(
    form.ListValue,
    'download_lists_via_proxy_section',
    _('Download lists through'),
  );
  o.depends('download_lists_via_proxy', '1');
  configureDownloadSectionOption(
    o,
    'download_lists_via_proxy_section',
    capabilities,
  );

  o = section.option(
    form.Flag,
    'download_components_via_proxy',
    _('Download components through a section'),
    _('Download component packages via the selected section'),
  );
  configureDownloadViaProxyFlag(o, 'download_components_via_proxy_section');

  o = section.option(
    form.ListValue,
    'download_components_via_proxy_section',
    _('Download components through'),
  );
  o.depends('download_components_via_proxy', '1');
  configureDownloadSectionOption(
    o,
    'download_components_via_proxy_section',
    capabilities,
  );

  o = section.option(
    form.Flag,
    'dont_touch_dhcp',
    _('Dont Touch My DHCP!'),
    _('P99 will not modify your DHCP configuration'),
  );
  o.default = '0';
  o.rmempty = false;

  o = section.option(
    form.ListValue,
    'config_path',
    _('Config File Path'),
    _(
      'Select path for sing-box config file. Change this ONLY if you know what you are doing',
    ),
  );
  o.value('/etc/sing-box/config.json', 'Flash (/etc/sing-box/config.json)');
  o.value('/tmp/sing-box/config.json', 'RAM (/tmp/sing-box/config.json)');
  o.default = '/etc/sing-box/config.json';
  o.rmempty = false;

  o = section.option(
    form.Value,
    'cache_path',
    _('Cache File Path'),
    _(
      'Select or enter path for sing-box cache file. Change this ONLY if you know what you are doing',
    ),
  );
  o.value('/tmp/sing-box/cache.db', 'RAM (/tmp/sing-box/cache.db)');
  o.value(
    '/usr/share/sing-box/cache.db',
    'Flash (/usr/share/sing-box/cache.db)',
  );
  o.default = '/tmp/sing-box/cache.db';
  o.rmempty = false;
  o.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const val = `${value ?? ''}`.trim();
    if (!val) {
      return _('Cache file path cannot be empty');
    }

    if (!val.startsWith('/')) {
      return _('Path must be absolute (start with /)');
    }

    if (!val.endsWith('cache.db')) {
      return _('Path must end with cache.db');
    }

    const parts = val.split('/').filter(Boolean);
    if (parts.length < 2) {
      return _('Path must contain at least one directory (like /tmp/cache.db)');
    }

    return true;
  };

  o = section.option(
    form.ListValue,
    'log_level',
    _('Log Level'),
    _('Select the log level for sing-box'),
  );
  o.value('trace', 'Trace');
  o.value('debug', 'Debug');
  o.value('info', 'Info');
  o.value('warn', 'Warn');
  o.value('error', 'Error');
  o.value('fatal', 'Fatal');
  o.value('panic', 'Panic');
  o.default = 'warn';
  o.rmempty = false;

  o = section.option(
    form.Flag,
    'exclude_ntp',
    _('Exclude NTP'),
    _(
      'Exclude NTP protocol traffic from the tunnel to prevent it from being routed through the proxy or VPN',
    ),
  );
  o.default = '0';
  o.rmempty = false;
}
