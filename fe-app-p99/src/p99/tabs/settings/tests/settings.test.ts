import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  configureDnsDuration,
  configureDnsFailoverVisibility,
  configureDnsList,
  optionListValues,
} from '../dnsSettings';
import {
  configureDownloadSectionOption,
  configureDownloadViaProxyFlag,
  isDownloadSectionAction,
  refreshDownloadSectionChoices,
} from '../downloadSection';
import {
  latencyTestUrlChoices,
  validateLatencyTestUrl,
} from '../latencySettings';
import { createSettingsContent } from '../settings';
import type { LuciOption, LuciSection, UiCapabilities } from '../types';

describe('settings tab', () => {
  beforeAll(() => {
    Object.assign(globalThis, {
      form: {
        Value: class MockValue {},
        Flag: class MockFlag {},
        ListValue: class MockListValue {},
        DynamicList: class MockDynamicList {},
      },
      _: (s: string) => s,
    });
  });
  describe('isDownloadSectionAction', () => {
    it('returns true for core connection actions', () => {
      expect(isDownloadSectionAction('connection')).toBe(true);
      expect(isDownloadSectionAction('proxy')).toBe(true);
      expect(isDownloadSectionAction('outbound')).toBe(true);
      expect(isDownloadSectionAction('vpn')).toBe(true);
    });

    it('returns false for unsupported actions', () => {
      expect(isDownloadSectionAction('dns')).toBe(false);
      expect(isDownloadSectionAction('unknown')).toBe(false);
      expect(isDownloadSectionAction(undefined)).toBe(false);
    });

    it('evaluates zapret/zapret2/byedpi based on capabilities', () => {
      // If capabilities are not loaded yet, all are allowed as fallback
      expect(isDownloadSectionAction('zapret', undefined)).toBe(true);
      expect(
        isDownloadSectionAction('zapret', {
          loaded: false,
        } as UiCapabilities),
      ).toBe(true);

      // When loaded, depends on installed flag
      expect(
        isDownloadSectionAction('zapret', {
          loaded: true,
          zapretInstalled: true,
        } as UiCapabilities),
      ).toBe(true);
      expect(
        isDownloadSectionAction('zapret', {
          loaded: true,
          zapretInstalled: false,
        } as UiCapabilities),
      ).toBe(false);

      expect(
        isDownloadSectionAction('zapret2', {
          loaded: true,
          zapret2Installed: true,
        } as UiCapabilities),
      ).toBe(true);
      expect(
        isDownloadSectionAction('zapret2', {
          loaded: true,
          zapret2Installed: false,
        } as UiCapabilities),
      ).toBe(false);

      expect(
        isDownloadSectionAction('byedpi', {
          loaded: true,
          byedpiInstalled: true,
        } as UiCapabilities),
      ).toBe(true);
      expect(
        isDownloadSectionAction('byedpi', {
          loaded: true,
          byedpiInstalled: false,
        } as UiCapabilities),
      ).toBe(false);
    });
  });

  describe('latencySettings', () => {
    it('returns choices list', () => {
      const choices = latencyTestUrlChoices();
      expect(Array.isArray(choices)).toBe(true);
      expect(choices.length).toBeGreaterThan(0);
    });

    it('validates latency test url correctly', () => {
      expect(
        validateLatencyTestUrl('https://www.gstatic.com/generate_204'),
      ).toBe(true);
      expect(
        validateLatencyTestUrl('http://cp.cloudflare.com/generate_204'),
      ).toBe(true);
      expect(validateLatencyTestUrl('not-a-url')).not.toBe(true);
      expect(validateLatencyTestUrl('')).not.toBe(true);
    });
  });

  describe('downloadSection', () => {
    it('refreshDownloadSectionChoices populates option with enabled download sections', () => {
      const option: LuciOption = {
        keylist: [],
        vallist: [],
        map: {
          data: {
            state: {
              values: {
                p99: {
                  sec1: {
                    '.type': 'section',
                    enabled: '1',
                    action: 'proxy',
                    label: 'Proxy Section',
                  },
                  sec2: {
                    '.type': 'section',
                    enabled: '0',
                    action: 'proxy',
                    label: 'Disabled Section',
                  },
                  sec3: {
                    '.type': 'section',
                    enabled: '1',
                    action: 'dns',
                    label: 'DNS Section',
                  },
                  sec4: {
                    '.type': 'not_a_section',
                    enabled: '1',
                    action: 'proxy',
                  },
                },
              },
            },
          },
        },
        value(key: string, label?: string) {
          this.keylist?.push(key);
          this.vallist?.push(label || key);
        },
        depends: vi.fn(),
      };

      refreshDownloadSectionChoices(option);
      expect(option.keylist).toEqual(['sec1']);
      expect(option.vallist).toEqual(['Proxy Section']);
    });

    it('configureDownloadSectionOption sets lifecycle methods', () => {
      const getMock = vi.fn().mockReturnValue('custom_sec');
      const setMock = vi.fn();
      const unsetMock = vi.fn();
      Object.assign(globalThis, {
        uci: {
          get: getMock,
          set: setMock,
          unset: unsetMock,
        },
      });

      const option: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
      };

      configureDownloadSectionOption(option, 'download_section_opt');

      expect(option.default).toBe('');
      expect(option.rmempty).toBe(false);
      expect(option.cfgvalue?.('sec_id')).toBe('custom_sec');
      expect(getMock).toHaveBeenCalledWith(
        'p99',
        'sec_id',
        'download_section_opt',
      );

      option.write?.('sec_id', ' new_val ');
      expect(setMock).toHaveBeenCalledWith(
        'p99',
        'sec_id',
        'download_section_opt',
        'new_val',
      );

      option.write?.('sec_id', '');
      expect(unsetMock).toHaveBeenCalledWith(
        'p99',
        'sec_id',
        'download_section_opt',
      );

      option.remove?.('sec_id');
      expect(unsetMock).toHaveBeenCalledWith(
        'p99',
        'sec_id',
        'download_section_opt',
      );

      expect(option.validate?.('sec_id', 'chosen')).toBe(true);
      expect(option.validate?.('sec_id', '')).not.toBe(true);
    });

    it('configureDownloadViaProxyFlag sets and unsets section on disable', () => {
      const setMock = vi.fn();
      const unsetMock = vi.fn();
      Object.assign(globalThis, {
        uci: {
          set: setMock,
          unset: unsetMock,
        },
      });

      const option: LuciOption = {
        option: 'my_flag',
        value: vi.fn(),
        depends: vi.fn(),
      };

      configureDownloadViaProxyFlag(option, 'target_section');

      expect(option.default).toBe('0');
      expect(option.rmempty).toBe(false);

      option.write?.('sec1', '1');
      expect(setMock).toHaveBeenCalledWith('p99', 'sec1', 'my_flag', '1');
      expect(unsetMock).not.toHaveBeenCalled();

      option.write?.('sec1', '0');
      expect(setMock).toHaveBeenCalledWith('p99', 'sec1', 'my_flag', '0');
      expect(unsetMock).toHaveBeenCalledWith('p99', 'sec1', 'target_section');
    });
  });

  describe('dnsSettings', () => {
    it('optionListValues handles arrays, strings, and null', () => {
      const opt: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
        formvalue: vi.fn().mockReturnValue([' 1.1.1.1 ', ' 8.8.8.8 ']),
      };

      expect(optionListValues(opt, 'sec1')).toEqual(['1.1.1.1', '8.8.8.8']);

      opt.formvalue = vi.fn().mockReturnValue(null);
      opt.cfgvalue = vi.fn().mockReturnValue(' 9.9.9.9 ');
      expect(optionListValues(opt, 'sec1')).toEqual(['9.9.9.9']);
    });

    it('configureDnsList validates single and multiple DNS inputs', () => {
      const option: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
        cfgvalue: vi.fn().mockReturnValue(['77.88.8.8']),
      };

      configureDnsList(option, { '77.88.8.8': 'Yandex' }, '77.88.8.8');
      expect(option.default).toEqual(['77.88.8.8']);

      // Valid DNS IP
      expect(option.validate?.('sec1', '1.1.1.1')).toBe(true);

      // Empty with existing list items
      expect(option.validate?.('sec1', '')).toBe(true);

      // Empty with no list items
      option.cfgvalue = vi.fn().mockReturnValue([]);
      expect(option.validate?.('sec1', '')).not.toBe(true);

      // Invalid DNS
      expect(
        option.validate?.('sec1', 'not-valid-dns-999.999.999.999'),
      ).not.toBe(true);
    });

    it('configureDnsFailoverVisibility sets depends and checkDepends', () => {
      const option: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
      };
      const dnsOpt: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
        cfgvalue: vi.fn().mockReturnValue(['1.1.1.1']),
      };
      const bootOpt: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
        cfgvalue: vi.fn().mockReturnValue(['8.8.8.8']),
      };

      configureDnsFailoverVisibility(option, dnsOpt, bootOpt);

      expect(option.depends).toHaveBeenCalledWith(
        'dns_server',
        '__p99_multiple_dns__',
      );
      expect(option.depends).toHaveBeenCalledWith(
        'bootstrap_dns_server',
        '__p99_multiple_dns__',
      );
      expect(option.retain).toBe(true);

      // Single server in both -> checkDepends is false
      expect(option.checkDepends?.('sec1')).toBe(false);

      // Multiple servers in dnsOpt -> checkDepends is true
      dnsOpt.cfgvalue = vi.fn().mockReturnValue(['1.1.1.1', '1.0.0.1']);
      expect(option.checkDepends?.('sec1')).toBe(true);
    });

    it('configureDnsDuration validates sing-box durations', () => {
      const option: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
      };
      const dnsOpt: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
      };
      const bootOpt: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
      };

      configureDnsDuration(option, '10s', dnsOpt, bootOpt);
      expect(option.default).toBe('10s');
      expect(option.validate?.('sec1', '10s')).toBe(true);
      expect(option.validate?.('sec1', '2m30s')).toBe(true);
      expect(option.validate?.('sec1', 'invalid')).not.toBe(true);
    });
  });

  describe('createSettingsContent smoke test', () => {
    it('creates all expected options on the section', () => {
      const createdOptions: Record<string, LuciOption> = {};

      const mockSection: LuciSection = {
        option: vi.fn((_type, name: string) => {
          const opt: LuciOption = {
            option: name,
            value: vi.fn(),
            depends: vi.fn(),
          };
          createdOptions[name] = opt;
          return opt;
        }),
      };

      createSettingsContent(mockSection);

      const expectedOptions = [
        'dns_type',
        'dns_server',
        'bootstrap_dns_server',
        'dns_check_interval',
        'dns_recovery_check_interval',
        'dns_check_timeout',
        'dns_rewrite_ttl',
        'dns_strategy',
        'dns_detour_enabled',
        'dns_detour_section',
        'source_network_interfaces',
        'enable_output_network_interface',
        'output_network_interface',
        'enable_badwan_interface_monitoring',
        'badwan_monitored_interfaces',
        'badwan_reload_delay',
        'enable_yacd',
        'enable_yacd_wan_access',
        'yacd_secret_key',
        'disable_quic',
        'list_update_enabled',
        'update_interval',
        'component_update_check_enabled',
        'component_update_check_interval',
        'latency_test_url',
        'latency_test_timeout',
        'shared_latency_pool',
        'shared_latency_interval',
        'download_lists_via_proxy',
        'download_lists_via_proxy_section',
        'download_components_via_proxy',
        'download_components_via_proxy_section',
        'dont_touch_dhcp',
        'config_path',
        'cache_path',
        'log_level',
        'exclude_ntp',
      ];

      for (const optName of expectedOptions) {
        expect(createdOptions[optName]).toBeDefined();
      }
    });
  });
});
