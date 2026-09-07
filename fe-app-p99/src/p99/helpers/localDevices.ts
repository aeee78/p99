import { validateIP } from '../../validators/validateIp';
import type { LuciOption } from '../tabs/settings/types';

export type LocalDeviceChoiceMap = Record<string, string>;

export interface HostHintEntry {
  ipaddrs?: string[] | string;
  ipv4?: string[] | string;
  ipv6?: string[] | string;
  name?: string;
}

export interface DhcpLeaseEntry {
  ipaddr?: string;
  hostname?: string;
}

export interface DhcpLeasesResponse {
  dhcp_leases?: DhcpLeaseEntry[];
}

export interface NetworkInterfaceEntry {
  'ipv4-address'?: Array<{ address: string } | string>;
  'ipv6-address'?: Array<{ address: string } | string>;
}

let localDeviceChoicesCache: LocalDeviceChoiceMap | null = null;
let localDeviceChoicesPromise: Promise<LocalDeviceChoiceMap> | null = null;

export function resetLocalDeviceChoicesCache(): void {
  localDeviceChoicesCache = null;
  localDeviceChoicesPromise = null;
}

export function normalizeOptionValues(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => `${item}`.trim())
      .filter(Boolean);
  }

  return `${value}`
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeLocalDeviceName(name: unknown): string {
  return `${name ?? ''}`.trim().replace(/\.lan$/i, '');
}

export function addLocalDeviceChoice(
  choices: LocalDeviceChoiceMap,
  ip: unknown,
  name: unknown,
): void {
  const normalizedIp = `${ip ?? ''}`.trim();
  const normalizedName = normalizeLocalDeviceName(name);

  if (!normalizedIp || !normalizedName) {
    return;
  }

  if (!validateIP(normalizedIp).valid) {
    return;
  }

  choices[normalizedIp] = normalizedName;
}

export function addRouterIp(
  routerIps: Record<string, boolean>,
  ip: unknown,
): void {
  const normalizedIp = `${ip ?? ''}`.trim();

  if (!normalizedIp || !validateIP(normalizedIp).valid) {
    return;
  }

  routerIps[normalizedIp] = true;
}

export function buildRouterIpMap(
  networkInterfaces: unknown,
): Record<string, boolean> {
  const routerIps: Record<string, boolean> = {};

  if (!Array.isArray(networkInterfaces)) {
    return routerIps;
  }

  networkInterfaces.forEach((networkInterface: unknown) => {
    const ipAddresses: Array<unknown> = [];
    const ifaceObj =
      networkInterface && typeof networkInterface === 'object'
        ? (networkInterface as NetworkInterfaceEntry)
        : null;

    const ipv4Addresses =
      ifaceObj && Array.isArray(ifaceObj['ipv4-address'])
        ? ifaceObj['ipv4-address']
        : [];
    const ipv6Addresses =
      ifaceObj && Array.isArray(ifaceObj['ipv6-address'])
        ? ifaceObj['ipv6-address']
        : [];

    ipAddresses.push(...ipv4Addresses, ...ipv6Addresses);
    ipAddresses.forEach((address: unknown) => {
      const addrStr =
        address && typeof address === 'object' && 'address' in address
          ? (address as { address: string }).address
          : address;
      addRouterIp(routerIps, addrStr);
    });
  });

  return routerIps;
}

export function buildLocalDeviceChoices(
  hostHints: unknown,
  dhcpLeases: unknown,
  networkInterfaces: unknown,
): LocalDeviceChoiceMap {
  const choices: LocalDeviceChoiceMap = {};
  const routerIps = buildRouterIpMap(networkInterfaces);

  if (hostHints && typeof hostHints === 'object') {
    Object.values(hostHints as Record<string, HostHintEntry>).forEach(
      (hint) => {
        if (!hint || typeof hint !== 'object') {
          return;
        }

        [
          ...normalizeOptionValues(hint.ipaddrs),
          ...normalizeOptionValues(hint.ipv4),
          ...normalizeOptionValues(hint.ipv6),
        ].forEach((ip) => {
          addLocalDeviceChoice(choices, ip, hint.name);
        });
      },
    );
  }

  if (
    dhcpLeases &&
    typeof dhcpLeases === 'object' &&
    Array.isArray((dhcpLeases as DhcpLeasesResponse).dhcp_leases)
  ) {
    (dhcpLeases as DhcpLeasesResponse).dhcp_leases?.forEach((lease) => {
      if (!lease || typeof lease !== 'object') {
        return;
      }

      addLocalDeviceChoice(choices, lease.ipaddr, lease.hostname);
    });
  }

  Object.keys(routerIps).forEach((ip) => {
    delete choices[ip];
  });

  return choices;
}

export function sortLocalDeviceChoiceValues(
  choices: LocalDeviceChoiceMap,
): string[] {
  return Object.keys(choices).sort((a, b) => {
    const byName = `${choices[a]}`.localeCompare(`${choices[b]}`);
    return byName || a.localeCompare(b);
  });
}

export function hasSingleIpValue(values: unknown): boolean {
  return normalizeOptionValues(values).some((value) => validateIP(value).valid);
}

export function loadLocalDeviceChoices(): Promise<LocalDeviceChoiceMap> {
  if (localDeviceChoicesCache) {
    return Promise.resolve(localDeviceChoicesCache);
  }

  if (localDeviceChoicesPromise) {
    return localDeviceChoicesPromise;
  }

  const callHostHints =
    typeof rpc !== 'undefined' && typeof rpc.declare === 'function'
      ? rpc.declare({
          object: 'luci-rpc',
          method: 'getHostHints',
          expect: { '': {} },
        })
      : () => Promise.resolve({});

  const callDHCPLeases =
    typeof rpc !== 'undefined' && typeof rpc.declare === 'function'
      ? rpc.declare({
          object: 'luci-rpc',
          method: 'getDHCPLeases',
          expect: { '': {} },
        })
      : () => Promise.resolve({});

  const callNetworkInterfaceDump =
    typeof rpc !== 'undefined' && typeof rpc.declare === 'function'
      ? rpc.declare({
          object: 'network.interface',
          method: 'dump',
          expect: { interface: [] },
        })
      : () => Promise.resolve([]);

  localDeviceChoicesPromise = Promise.all([
    callHostHints().catch(() => ({})),
    callDHCPLeases().catch(() => ({})),
    callNetworkInterfaceDump().catch(() => []),
  ])
    .then(([hostHints, dhcpLeases, networkInterfaces]) => {
      localDeviceChoicesCache = buildLocalDeviceChoices(
        hostHints,
        dhcpLeases,
        networkInterfaces,
      );
      return localDeviceChoicesCache;
    })
    .finally(() => {
      localDeviceChoicesPromise = null;
    });

  return localDeviceChoicesPromise;
}

export function preloadLocalDeviceChoicesForValues(
  values: unknown,
): Promise<LocalDeviceChoiceMap | null> {
  return hasSingleIpValue(values)
    ? loadLocalDeviceChoices()
    : Promise.resolve(null);
}

export function createLocalDeviceDynamicListWidget(
  option: LuciOption,
  section_id: string,
  cfgvalue?: unknown,
): Promise<HTMLElement> {
  const values = normalizeOptionValues(
    cfgvalue != null ? cfgvalue : option.default,
  );
  const shouldResolveExistingLabels = hasSingleIpValue(values);

  return (
    shouldResolveExistingLabels ? loadLocalDeviceChoices() : Promise.resolve({})
  ).then((initialChoices) => {
    const choices = localDeviceChoicesCache || initialChoices || {};
    const widget = new ui.DynamicList(values, choices, {
      id: option.cbid ? option.cbid(section_id) : undefined,
      sort: sortLocalDeviceChoiceValues(choices),
      optional: option.optional || option.rmempty,
      datatype: option.datatype,
      placeholder: option.placeholder,
      validate: option.validate
        ? option.validate.bind(option, section_id)
        : undefined,
      disabled:
        option.readonly != null ? option.readonly : option.map?.readonly,
    });
    const node = widget.render();
    if (typeof option.onDeviceWidgetReady === 'function') {
      option.onDeviceWidgetReady(section_id, widget);
    }
    if (typeof option.onDeviceListChange === 'function') {
      node.addEventListener('cbi-dynlist-change', () => {
        option.onDeviceListChange?.(section_id, widget.getValue());
      });
    }
    let choicesLoaded = Boolean(localDeviceChoicesCache);
    let choicesLoading = false;

    const loadChoices = () => {
      if (choicesLoaded || choicesLoading) {
        return;
      }

      choicesLoading = true;
      loadLocalDeviceChoices()
        .then((loadedChoices) => {
          widget.clearChoices();
          widget.addChoices(
            sortLocalDeviceChoiceValues(loadedChoices),
            loadedChoices,
          );
          choicesLoaded = true;
        })
        .finally(() => {
          choicesLoading = false;
        });
    };

    const maybeLoadChoices = (ev: Event) => {
      const target = ev.target as HTMLElement | null;
      if (
        target &&
        typeof target.closest === 'function' &&
        target.closest('.cbi-dropdown')
      ) {
        loadChoices();
      }
    };

    node.addEventListener('mousedown', maybeLoadChoices, true);
    node.addEventListener('focusin', maybeLoadChoices, true);

    return node;
  });
}
