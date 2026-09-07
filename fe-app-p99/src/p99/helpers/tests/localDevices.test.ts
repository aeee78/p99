import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addLocalDeviceChoice,
  addRouterIp,
  buildLocalDeviceChoices,
  buildRouterIpMap,
  createLocalDeviceDynamicListWidget,
  hasSingleIpValue,
  loadLocalDeviceChoices,
  normalizeLocalDeviceName,
  normalizeOptionValues,
  preloadLocalDeviceChoicesForValues,
  resetLocalDeviceChoicesCache,
  sortLocalDeviceChoiceValues,
} from '../localDevices';
import type { LuciOption } from '../../tabs/settings/types';

describe('localDevices helpers', () => {
  beforeEach(() => {
    resetLocalDeviceChoicesCache();
  });

  describe('normalizeOptionValues', () => {
    it('handles empty and null values', () => {
      expect(normalizeOptionValues(null)).toEqual([]);
      expect(normalizeOptionValues(undefined)).toEqual([]);
      expect(normalizeOptionValues('')).toEqual([]);
    });

    it('splits whitespace separated strings', () => {
      expect(normalizeOptionValues('  192.168.1.1   192.168.1.2  ')).toEqual([
        '192.168.1.1',
        '192.168.1.2',
      ]);
    });

    it('cleans arrays', () => {
      expect(
        normalizeOptionValues([' 192.168.1.1 ', '', null, '192.168.1.2']),
      ).toEqual(['192.168.1.1', '192.168.1.2']);
    });
  });

  describe('normalizeLocalDeviceName', () => {
    it('strips .lan suffix case-insensitively and trims', () => {
      expect(normalizeLocalDeviceName('my-pc.lan')).toBe('my-pc');
      expect(normalizeLocalDeviceName('  phone.LAN  ')).toBe('phone');
      expect(normalizeLocalDeviceName('router')).toBe('router');
      expect(normalizeLocalDeviceName(null)).toBe('');
    });
  });

  describe('addLocalDeviceChoice & addRouterIp', () => {
    it('adds valid IP and ignores invalid ones', () => {
      const choices: Record<string, string> = {};
      addLocalDeviceChoice(choices, '192.168.1.50', 'Laptop.lan');
      expect(choices['192.168.1.50']).toBe('Laptop');

      // Invalid IP should not be added
      addLocalDeviceChoice(choices, 'not-an-ip', 'Test');
      expect(choices['not-an-ip']).toBeUndefined();

      // Empty name should not be added
      addLocalDeviceChoice(choices, '192.168.1.51', '');
      expect(choices['192.168.1.51']).toBeUndefined();
    });

    it('adds router IP and ignores invalid ones', () => {
      const routerIps: Record<string, boolean> = {};
      addRouterIp(routerIps, '192.168.1.1');
      expect(routerIps['192.168.1.1']).toBe(true);

      addRouterIp(routerIps, 'invalid');
      expect(routerIps['invalid']).toBeUndefined();
    });
  });

  describe('buildRouterIpMap', () => {
    it('extracts all ipv4 and ipv6 router addresses', () => {
      const ifaces = [
        {
          'ipv4-address': [{ address: '192.168.1.1' }, '10.0.0.1'],
          'ipv6-address': [{ address: 'fd00::1' }],
        },
        null,
        'invalid',
      ];

      const routerIps = buildRouterIpMap(ifaces);
      expect(routerIps['192.168.1.1']).toBe(true);
      expect(routerIps['10.0.0.1']).toBe(true);
      expect(routerIps['fd00::1']).toBe(true);
      expect(Object.keys(routerIps).length).toBe(3);
    });

    it('returns empty object when interfaces is not array', () => {
      expect(buildRouterIpMap(null)).toEqual({});
    });
  });

  describe('buildLocalDeviceChoices', () => {
    it('combines hostHints and dhcpLeases while excluding router IPs', () => {
      const hostHints = {
        hint1: {
          ipaddrs: ['192.168.1.10'],
          ipv4: '192.168.1.11',
          name: 'DeviceA',
        },
        hint2: {
          name: 'RouterSelf',
          ipaddrs: '192.168.1.1',
        },
      };

      const dhcpLeases = {
        dhcp_leases: [
          { ipaddr: '192.168.1.20', hostname: 'Phone.lan' },
          { ipaddr: '192.168.1.1', hostname: 'RouterLan' },
        ],
      };

      const ifaces = [
        {
          'ipv4-address': [{ address: '192.168.1.1' }],
        },
      ];

      const choices = buildLocalDeviceChoices(hostHints, dhcpLeases, ifaces);
      expect(choices['192.168.1.10']).toBe('DeviceA');
      expect(choices['192.168.1.11']).toBe('DeviceA');
      expect(choices['192.168.1.20']).toBe('Phone');
      // Router IP 192.168.1.1 must be excluded
      expect(choices['192.168.1.1']).toBeUndefined();
    });
  });

  describe('sortLocalDeviceChoiceValues', () => {
    it('sorts keys alphabetically by their device name label', () => {
      const choices = {
        '192.168.1.3': 'Zebra',
        '192.168.1.2': 'Apple',
        '192.168.1.1': 'Banana',
      };

      const sorted = sortLocalDeviceChoiceValues(choices);
      expect(sorted).toEqual(['192.168.1.2', '192.168.1.1', '192.168.1.3']);
    });
  });

  describe('hasSingleIpValue', () => {
    it('returns true if any token is a valid IP', () => {
      expect(hasSingleIpValue('192.168.1.100')).toBe(true);
      expect(hasSingleIpValue(['random', '10.0.0.2'])).toBe(true);
      expect(hasSingleIpValue(['hostname.lan', 'invalid'])).toBe(false);
      expect(hasSingleIpValue([])).toBe(false);
    });
  });

  describe('loadLocalDeviceChoices & preload', () => {
    it('loads and caches device choices', async () => {
      const choices = await loadLocalDeviceChoices();
      expect(typeof choices).toBe('object');

      const cached = await loadLocalDeviceChoices();
      expect(cached).toBe(choices);

      // preloadLocalDeviceChoicesForValues returns null for non-IP
      const preloadedNull = await preloadLocalDeviceChoicesForValues('not-ip');
      expect(preloadedNull).toBeNull();

      // preload for IP returns choices
      const preloaded = await preloadLocalDeviceChoicesForValues('192.168.1.1');
      expect(preloaded).toBe(choices);
    });
  });

  describe('createLocalDeviceDynamicListWidget', () => {
    it('renders widget and connects lifecycle hooks', async () => {
      const mockNode = {
        addEventListener: vi.fn(),
      } as unknown as HTMLElement;

      const mockWidget = {
        render: vi.fn().mockReturnValue(mockNode),
        getValue: vi.fn().mockReturnValue(['192.168.1.5']),
        clearChoices: vi.fn(),
        addChoices: vi.fn(),
      };

      Object.assign(globalThis, {
        ui: {
          DynamicList: class {
            constructor() {
              return mockWidget;
            }
          },
        },
      });

      const onWidgetReady = vi.fn();
      const onListChange = vi.fn();

      const option: LuciOption = {
        value: vi.fn(),
        depends: vi.fn(),
        cbid: vi.fn().mockReturnValue('cbid.p99.sec.field'),
        onDeviceWidgetReady: onWidgetReady,
        onDeviceListChange: onListChange,
      };

      const node = await createLocalDeviceDynamicListWidget(
        option,
        'sec1',
        '192.168.1.5',
      );
      expect(node).toBe(mockNode);
      expect(onWidgetReady).toHaveBeenCalledWith('sec1', mockWidget);
      expect(mockNode.addEventListener).toHaveBeenCalledWith(
        'cbi-dynlist-change',
        expect.any(Function),
      );
      expect(mockNode.addEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function),
        true,
      );
      expect(mockNode.addEventListener).toHaveBeenCalledWith(
        'focusin',
        expect.any(Function),
        true,
      );
    });
  });
});
