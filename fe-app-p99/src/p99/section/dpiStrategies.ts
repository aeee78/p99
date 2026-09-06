/**
 * DPI Strategies validation, tokenization and argument checking for Zapret (nfqws), Zapret2 (nfqws2), and ByeDPI (ciadpi).
 */

export const NFQWS_REQUIRED_ARG_OPTIONS = new Set([
  '--ctrack-timeouts',
  '--dpi-desync',
  '--dpi-desync-badack-increment',
  '--dpi-desync-badseq-increment',
  '--dpi-desync-cutoff',
  '--dpi-desync-fake-dht',
  '--dpi-desync-fake-discord',
  '--dpi-desync-fake-http',
  '--dpi-desync-fake-quic',
  '--dpi-desync-fake-stun',
  '--dpi-desync-fake-syndata',
  '--dpi-desync-fake-tcp-mod',
  '--dpi-desync-fake-tls',
  '--dpi-desync-fake-tls-mod',
  '--dpi-desync-fake-unknown',
  '--dpi-desync-fake-unknown-udp',
  '--dpi-desync-fake-wireguard',
  '--dpi-desync-fakedsplit-mod',
  '--dpi-desync-fakedsplit-pattern',
  '--dpi-desync-fooling',
  '--dpi-desync-fwmark',
  '--dpi-desync-hostfakesplit-midhost',
  '--dpi-desync-hostfakesplit-mod',
  '--dpi-desync-ipfrag-pos-tcp',
  '--dpi-desync-ipfrag-pos-udp',
  '--dpi-desync-repeats',
  '--dpi-desync-split-http-req',
  '--dpi-desync-split-pos',
  '--dpi-desync-split-seqovl',
  '--dpi-desync-split-seqovl-pattern',
  '--dpi-desync-split-tls',
  '--dpi-desync-start',
  '--dpi-desync-ts-increment',
  '--dpi-desync-ttl',
  '--dpi-desync-ttl6',
  '--dpi-desync-udplen-increment',
  '--dpi-desync-udplen-pattern',
  '--dup',
  '--dup-badack-increment',
  '--dup-badseq-increment',
  '--dup-cutoff',
  '--dup-fooling',
  '--dup-ip-id',
  '--dup-start',
  '--dup-ts-increment',
  '--dup-ttl',
  '--dup-ttl6',
  '--filter-l3',
  '--filter-l7',
  '--filter-tcp',
  '--filter-udp',
  '--hostlist',
  '--hostlist-auto',
  '--hostlist-auto-debug',
  '--hostlist-auto-fail-threshold',
  '--hostlist-auto-fail-time',
  '--hostlist-auto-retrans-threshold',
  '--hostlist-domains',
  '--hostlist-exclude',
  '--hostlist-exclude-domains',
  '--hostspell',
  '--ip-id',
  '--ipcache-lifetime',
  '--ipset',
  '--ipset-exclude',
  '--ipset-exclude-ip',
  '--ipset-ip',
  '--orig-mod-cutoff',
  '--orig-mod-start',
  '--orig-ttl',
  '--orig-ttl6',
  '--pidfile',
  '--qnum',
  '--uid',
  '--user',
  '--wsize',
  '--wssize',
  '--wssize-cutoff',
  '--wssize-forced-cutoff',
]);

export const NFQWS_OPTIONAL_ARG_OPTIONS = new Set([
  '--comment',
  '--ctrack-disable',
  '--debug',
  '--dpi-desync-any-protocol',
  '--dpi-desync-autottl',
  '--dpi-desync-autottl6',
  '--dpi-desync-skip-nosni',
  '--dpi-desync-tcp-flags-set',
  '--dpi-desync-tcp-flags-unset',
  '--dup-autottl',
  '--dup-autottl6',
  '--dup-replace',
  '--dup-tcp-flags-set',
  '--dup-tcp-flags-unset',
  '--ipcache-hostname',
  '--orig-autottl',
  '--orig-autottl6',
  '--orig-tcp-flags-set',
  '--orig-tcp-flags-unset',
  '--synack-split',
]);

export const NFQWS_NO_ARG_OPTIONS = new Set([
  '--bind-fix4',
  '--bind-fix6',
  '--daemon',
  '--domcase',
  '--dry-run',
  '--hostcase',
  '--hostnospace',
  '--methodeol',
  '--new',
  '--skip',
  '--version',
]);

export const NFQWS2_REQUIRED_ARG_OPTIONS = new Set([
  '--blob',
  '--cookie',
  '--ctrack-timeouts',
  '--filter-l3',
  '--filter-l7',
  '--filter-tcp',
  '--filter-udp',
  '--fwmark',
  '--fuzz',
  '--hostlist',
  '--hostlist-auto',
  '--hostlist-auto-debug',
  '--hostlist-auto-fail-threshold',
  '--hostlist-auto-fail-time',
  '--hostlist-auto-retrans-threshold',
  '--hostlist-domains',
  '--hostlist-exclude',
  '--hostlist-exclude-domains',
  '--import',
  '--in-range',
  '--ipcache-lifetime',
  '--ipset',
  '--ipset-exclude',
  '--ipset-exclude-ip',
  '--ipset-ip',
  '--lua-gc',
  '--lua-init',
  '--lua-desync',
  '--name',
  '--out-range',
  '--payload',
  '--pidfile',
  '--qnum',
  '--uid',
  '--user',
]);

export const NFQWS2_OPTIONAL_ARG_OPTIONS = new Set([
  '--chdir',
  '--comment',
  '--ctrack-disable',
  '--debug',
  '--hostlist-auto-retrans-reset',
  '--intercept',
  '--ipcache-hostname',
  '--new',
  '--payload-disable',
  '--reasm-disable',
  '--server',
  '--template',
  '--writeable',
]);

export const NFQWS2_NO_ARG_OPTIONS = new Set([
  '--bind-fix4',
  '--bind-fix6',
  '--daemon',
  '--dry-run',
  '--skip',
  '--version',
]);

export const BYEDPI_LONG_VALUE_OPTIONS = new Set([
  '--max-conn',
  '--conn-ip',
  '--buf-size',
  '--debug',
  '--def-ttl',
  '--auto',
  '--auto-mode',
  '--cache-ttl',
  '--cache-dump',
  '--timeout',
  '--proto',
  '--hosts',
  '--ipset',
  '--pf',
  '--round',
  '--split',
  '--disorder',
  '--oob',
  '--disoob',
  '--fake',
  '--fake-sni',
  '--ttl',
  '--fake-offset',
  '--fake-data',
  '--fake-tls-mod',
  '--oob-data',
  '--mod-http',
  '--tlsrec',
  '--tlsminor',
  '--udp-fake',
]);

export const BYEDPI_LONG_FLAG_OPTIONS = new Set([
  '--md5sig',
  '--tfo',
  '--drop-sack',
  '--no-domain',
  '--no-udp',
]);

export const BYEDPI_SHORT_VALUE_OPTIONS = new Set([
  '-c',
  '-I',
  '-b',
  '-x',
  '-g',
  '-A',
  '-L',
  '-u',
  '-y',
  '-T',
  '-K',
  '-H',
  '-j',
  '-V',
  '-R',
  '-s',
  '-d',
  '-o',
  '-q',
  '-f',
  '-n',
  '-t',
  '-O',
  '-l',
  '-Q',
  '-e',
  '-M',
  '-r',
  '-m',
  '-a',
]);

export const BYEDPI_SHORT_FLAG_OPTIONS = new Set([
  '-N',
  '-U',
  '-F',
  '-S',
  '-Y',
]);

export function getNfqwsOptionArgumentMode(
  option: string,
): 'required' | 'optional' | 'none' | 'unknown' {
  if (NFQWS_REQUIRED_ARG_OPTIONS.has(option)) return 'required';
  if (NFQWS_OPTIONAL_ARG_OPTIONS.has(option)) return 'optional';
  if (NFQWS_NO_ARG_OPTIONS.has(option)) return 'none';
  return 'unknown';
}

export function getNfqws2OptionArgumentMode(
  option: string,
): 'required' | 'optional' | 'none' | 'unknown' {
  if (NFQWS2_REQUIRED_ARG_OPTIONS.has(option)) return 'required';
  if (NFQWS2_OPTIONAL_ARG_OPTIONS.has(option)) return 'optional';
  if (NFQWS2_NO_ARG_OPTIONS.has(option)) return 'none';
  return 'unknown';
}

export function normalizeNfqwsStrategyWhitespace(value: unknown): string {
  return value ? `${value}`.replace(/\s+/g, ' ').trim() : '';
}

export function normalizeNfqws2StrategyValue(value: unknown): string {
  return normalizeNfqwsStrategyWhitespace(value);
}

export function normalizeByedpiStrategyWhitespace(value: unknown): string {
  return normalizeNfqwsStrategyWhitespace(value);
}

export function normalizeByedpiStrategyValue(value: unknown): string {
  return normalizeNfqwsStrategyWhitespace(value);
}

export interface ForbiddenTokenResult {
  reason: string;
  captureNextValue: boolean;
}

export function getNfqwsForbiddenTokenInfo(
  token: string,
  _index?: number,
): ForbiddenTokenResult | null {
  const normalized = `${token || ''}`.trim();
  const lower = normalized.toLowerCase();

  if (lower === '--config' || lower.startsWith('--config=')) {
    return {
      reason:
        'External nfqws config files bypass P99 queue management and explicit validation.',
      captureNextValue: !normalized.includes('='),
    };
  }
  if (
    lower === '--hostlist' ||
    lower.startsWith('--hostlist=') ||
    lower === '--hostlist-exclude' ||
    lower.startsWith('--hostlist-exclude=') ||
    lower === '--hostlist-domains' ||
    lower.startsWith('--hostlist-domains=')
  ) {
    return {
      reason:
        'Resource selection by hostname inside nfqws is not supported here; sing-box selects resources before NFQUEUE.',
      captureNextValue: !normalized.includes('='),
    };
  }
  if (
    lower === '--ipset' ||
    lower.startsWith('--ipset=') ||
    lower === '--ipset-exclude' ||
    lower.startsWith('--ipset-exclude=')
  ) {
    return {
      reason:
        'Resource selection by IP or CIDR inside nfqws is not supported here; sing-box selects resources before NFQUEUE.',
      captureNextValue: !normalized.includes('='),
    };
  }
  if (lower === '<hostlist>' || lower === '<hostlist_noauto>') {
    return {
      reason:
        'Zapret hostlist templates are not supported here because P99 does not expand them for per-rule NFQWS strategies.',
      captureNextValue: false,
    };
  }
  if (lower === '--qnum' || lower.startsWith('--qnum=')) {
    return {
      reason:
        'The NFQUEUE number is assigned by P99 for each rule and must not be overridden here.',
      captureNextValue: !normalized.includes('='),
    };
  }
  if (
    lower === '--dpi-desync-fwmark' ||
    lower.startsWith('--dpi-desync-fwmark=') ||
    lower === '--fwmark' ||
    lower.startsWith('--fwmark=')
  ) {
    return {
      reason:
        'The desync fwmark is managed by P99 for loop prevention and must not be overridden here.',
      captureNextValue: !normalized.includes('='),
    };
  }
  if (lower === '--daemon' || lower === '-k' || lower === '-q') {
    return {
      reason:
        'P99 manages the nfqws process lifecycle itself, so daemon mode is not allowed here.',
      captureNextValue: false,
    };
  }
  if (lower === '--dry-run') {
    return {
      reason:
        'This field must start a working nfqws strategy; --dry-run exits immediately and is not allowed here.',
      captureNextValue: false,
    };
  }
  if (lower === '--version' || lower === '-v') {
    return {
      reason:
        'Version queries exit immediately and are not valid run strategies.',
      captureNextValue: false,
    };
  }
  return null;
}

export function getNfqws2ForbiddenTokenInfo(
  token: string,
  _index?: number,
): ForbiddenTokenResult | null {
  return getNfqwsForbiddenTokenInfo(token, _index);
}

export function byedpiTokenLooksLikeOption(token: string): boolean {
  return token.startsWith('-');
}

export function getByedpiShortOptionName(token: string): string | null {
  if (token.startsWith('-') && !token.startsWith('--') && token.length >= 2) {
    return token.slice(0, 2);
  }
  return null;
}

export function getByedpiControlledTokenInfo(token: string): {
  controlled: boolean;
  reason?: string;
} {
  const shortOpt = getByedpiShortOptionName(token);
  if (
    token === '-i' ||
    token.startsWith('-i=') ||
    token === '--ip' ||
    token.startsWith('--ip=')
  ) {
    return {
      controlled: true,
      reason:
        'Listen IP is controlled by P99 (:1080) and cannot be overridden.',
    };
  }
  if (
    token === '-p' ||
    token.startsWith('-p=') ||
    token === '--port' ||
    token.startsWith('--port=')
  ) {
    return {
      controlled: true,
      reason: 'Listen port is controlled by P99 and cannot be overridden.',
    };
  }
  if (shortOpt === '-i' || shortOpt === '-p') {
    return {
      controlled: true,
      reason: 'Listen address/port is managed by P99.',
    };
  }
  return { controlled: false };
}
