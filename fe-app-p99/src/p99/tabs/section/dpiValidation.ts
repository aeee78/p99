import {
  BYEDPI_LONG_FLAG_OPTIONS,
  BYEDPI_LONG_VALUE_OPTIONS,
  BYEDPI_SHORT_FLAG_OPTIONS,
  BYEDPI_SHORT_VALUE_OPTIONS,
  byedpiTokenLooksLikeOption,
  getByedpiControlledTokenInfo,
  getByedpiShortOptionName,
  getNfqws2ForbiddenTokenInfo,
  getNfqws2OptionArgumentMode,
  getNfqwsForbiddenTokenInfo,
  getNfqwsOptionArgumentMode,
  normalizeByedpiStrategyWhitespace,
  normalizeNfqwsStrategyWhitespace,
} from '../../section/dpiStrategies';
import {
  addAnnotationIssue,
  finalizeAnnotations,
  getOptionTextarea,
  refreshAnnotatedTextareaValidation,
  type Annotation,
  type TextareaAnalysisResult,
} from './annotatedTextarea';

export const ZAPRET_LEGACY_DEFAULT_NFQWS_OPT =
  '--filter-tcp=80 <HOSTLIST> --dpi-desync=fake,fakedsplit --dpi-desync-autottl=2 --dpi-desync-fooling=badsum --new --filter-tcp=443 --hostlist=/opt/zapret/ipset/zapret-hosts-google.txt --dpi-desync=fake,multidisorder --dpi-desync-split-pos=1,midsld --dpi-desync-repeats=11 --dpi-desync-fooling=badsum --dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com --new --filter-udp=443 --hostlist=/opt/zapret/ipset/zapret-hosts-google.txt --dpi-desync=fake --dpi-desync-repeats=11 --dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin --new --filter-udp=443 <HOSTLIST_NOAUTO> --dpi-desync=fake --dpi-desync-repeats=11 --new --filter-tcp=443 <HOSTLIST> --dpi-desync=multidisorder --dpi-desync-split-pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1';

export const ZAPRET_DEFAULT_NFQWS_OPT =
  '--filter-tcp=80 --dpi-desync=fake,fakedsplit --dpi-desync-autottl=2 --dpi-desync-fooling=badsum --new --filter-tcp=443 --dpi-desync=fake,multidisorder --dpi-desync-split-pos=1,midsld --dpi-desync-repeats=11 --dpi-desync-fooling=badsum --dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com --new --filter-udp=443 --dpi-desync=fake --dpi-desync-repeats=11 --dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin';

export const ZAPRET2_DEFAULT_NFQWS2_OPT =
  '--filter-tcp=80 --filter-l7=http --payload=http_req --lua-desync=fake:blob=fake_default_http:tcp_md5 --lua-desync=multisplit:pos=method+2 --new --filter-tcp=443 --filter-l7=tls --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_md5:tcp_seq=-10000 --lua-desync=multidisorder:pos=1,midsld --new --filter-udp=443 --filter-l7=quic --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6';

export const BYEDPI_DEFAULT_CMD_OPTS = '-o 2 --auto=t,r,a,s -d 2';
export const NFQWS_REMOTE_VALIDATION_DEBOUNCE_MS = 500;
export const NFQWS_VALIDATION_COMMAND = '/usr/bin/p99';

export interface RuntimeToken {
  value: string;
  start: number;
  end: number;
}

export function parseNfqwsRuntimeTokens(value: unknown): RuntimeToken[] {
  const text = value ? `${value}` : '';
  const tokens: RuntimeToken[] = [];
  const matcher = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text)) !== null) {
    tokens.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}

export function normalizeNfqwsStrategyValue(value: unknown): string {
  const normalized = normalizeNfqwsStrategyWhitespace(value);
  if (!normalized.length) {
    return '';
  }

  return normalized === ZAPRET_LEGACY_DEFAULT_NFQWS_OPT
    ? ZAPRET_DEFAULT_NFQWS_OPT
    : normalized;
}

export function normalizeNfqws2StrategyValue(value: unknown): string {
  const normalized = normalizeNfqwsStrategyWhitespace(value);
  return normalized.length ? normalized : ZAPRET2_DEFAULT_NFQWS2_OPT;
}

export function normalizeByedpiStrategyValue(value: unknown): string {
  const normalized = normalizeByedpiStrategyWhitespace(value);
  return normalized.length ? normalized : BYEDPI_DEFAULT_CMD_OPTS;
}

export interface RemoteValidationResult {
  valid: boolean;
  message: string;
  needle: string;
  needles: string[];
}

export const nfqwsRemoteValidationCache = new Map<
  string,
  RemoteValidationResult
>();
export const nfqwsRemoteValidationInflight = new Map<
  string,
  Promise<RemoteValidationResult>
>();
export const nfqws2RemoteValidationCache = new Map<
  string,
  RemoteValidationResult
>();
export const nfqws2RemoteValidationInflight = new Map<
  string,
  Promise<RemoteValidationResult>
>();
export const byedpiRemoteValidationCache = new Map<
  string,
  RemoteValidationResult
>();
export const byedpiRemoteValidationInflight = new Map<
  string,
  Promise<RemoteValidationResult>
>();

export function getValidationHeaderText(): string {
  return _('Validation errors:');
}

export function getDuplicateValueText(): string {
  return _('Duplicate value');
}

export function getCachedNfqwsRemoteValidation(
  value: unknown,
): RemoteValidationResult | null {
  const normalized = normalizeNfqwsStrategyValue(value);
  return normalized.length
    ? nfqwsRemoteValidationCache.get(normalized) || null
    : null;
}

export function cacheNfqwsRemoteValidation(
  value: unknown,
  result: Partial<RemoteValidationResult> | null | undefined,
): RemoteValidationResult {
  const normalized = normalizeNfqwsStrategyValue(value);
  const cached: RemoteValidationResult = {
    valid: result?.valid === true,
    message: result?.message ? `${result.message}` : '',
    needle: result?.needle ? `${result.needle}` : '',
    needles: Array.isArray(result?.needles)
      ? result.needles.filter(Boolean).map((item) => `${item}`)
      : result?.needle
        ? [`${result.needle}`]
        : [],
  };

  if (normalized.length) {
    nfqwsRemoteValidationCache.set(normalized, cached);
  }

  return cached;
}

export function buildNfqwsRemoteValidationFallback(
  error?: any,
): RemoteValidationResult {
  const message = error?.message
    ? `${error.message}`
    : _('Unable to validate the NFQWS strategy through the backend parser.');

  return {
    valid: false,
    message: _('Backend validation failed: %s').format(message),
    needle: '',
    needles: [],
  };
}

export function validateNfqwsStrategyRemotely(
  value: unknown,
): Promise<RemoteValidationResult> {
  const normalized = normalizeNfqwsStrategyValue(value);

  if (!normalized.length) {
    return Promise.resolve({
      valid: true,
      message: '',
      needle: '',
      needles: [],
    });
  }

  if (nfqwsRemoteValidationCache.has(normalized)) {
    return Promise.resolve(nfqwsRemoteValidationCache.get(normalized)!);
  }

  if (nfqwsRemoteValidationInflight.has(normalized)) {
    return nfqwsRemoteValidationInflight.get(normalized)!;
  }

  const validationTask = (
    typeof fs !== 'undefined' && typeof fs.exec === 'function'
      ? fs.exec(NFQWS_VALIDATION_COMMAND, [
          'validate_nfqws_strategy_json',
          normalized,
        ])
      : Promise.reject(new Error('fs.exec unavailable'))
  )
    .then((result: any) => {
      const payload = JSON.parse(
        (result && result.stdout ? result.stdout : '{}').trim() || '{}',
      );
      return cacheNfqwsRemoteValidation(normalized, {
        valid: payload.valid === true,
        message: payload.message || '',
        needle: payload.needle || '',
        needles: Array.isArray(payload.needles)
          ? payload.needles.filter(Boolean)
          : payload.needle
            ? [payload.needle]
            : [],
      });
    })
    .catch((error: unknown) =>
      cacheNfqwsRemoteValidation(
        normalized,
        buildNfqwsRemoteValidationFallback(error),
      ),
    )
    .finally(() => {
      nfqwsRemoteValidationInflight.delete(normalized);
    });

  nfqwsRemoteValidationInflight.set(normalized, validationTask);
  return validationTask;
}

export function buildNfqwsLocalAnalysis(
  value: unknown,
): TextareaAnalysisResult {
  const text = value ? `${value}` : '';
  if (!text.trim().length) {
    return {
      valid: false,
      message: _('NFQWS strategy cannot be empty'),
      annotations: [],
    };
  }

  if (text.trim() === ZAPRET_LEGACY_DEFAULT_NFQWS_OPT) {
    return { valid: true, message: '', annotations: [] };
  }

  const tokens = parseNfqwsRuntimeTokens(text);
  const annotationMap = new Map<
    string,
    { start: number; end: number; messages: string[] }
  >();
  const errors: string[] = [];

  for (let index = 0; index < tokens.length; ) {
    const token = tokens[index];
    const bareToken = token.value.includes('=')
      ? token.value.slice(0, token.value.indexOf('='))
      : token.value;
    const nextToken = tokens[index + 1] || null;

    const forbidden = getNfqwsForbiddenTokenInfo(token.value, index);
    if (forbidden) {
      addAnnotationIssue(annotationMap, token, forbidden.reason);

      let displayToken = token.value;

      if (
        forbidden.captureNextValue &&
        nextToken &&
        !nextToken.value.startsWith('--')
      ) {
        addAnnotationIssue(annotationMap, nextToken, forbidden.reason);
        displayToken = `${displayToken} ${nextToken.value}`;
        index += 2;
      } else {
        index += 1;
      }

      errors.push(`${displayToken}: ${forbidden.reason}`);
      continue;
    }

    if (!token.value.startsWith('--')) {
      const reason = _(
        'Unexpected standalone token. Use explicit flags such as --name or --name=value.',
      );
      addAnnotationIssue(annotationMap, token, reason);
      errors.push(`${token.value}: ${reason}`);
      index += 1;
      continue;
    }

    const mode = getNfqwsOptionArgumentMode(bareToken);
    if (mode === 'unknown') {
      const reason = _('Unknown NFQWS flag.');
      addAnnotationIssue(annotationMap, token, reason);
      errors.push(`${token.value}: ${reason}`);
      index += 1;
      continue;
    }

    if (mode === 'none') {
      if (token.value.includes('=')) {
        const reason = _('This flag does not accept a value.');
        addAnnotationIssue(annotationMap, token, reason);
        errors.push(`${token.value}: ${reason}`);
      }

      index += 1;
      continue;
    }

    if (mode === 'optional') {
      if (
        nextToken &&
        !token.value.includes('=') &&
        !nextToken.value.startsWith('--')
      ) {
        const reason = _(
          "Optional values must be attached with '=' here; a separate token would be ignored by nfqws.",
        );
        addAnnotationIssue(annotationMap, token, reason);
        addAnnotationIssue(annotationMap, nextToken, reason);
        errors.push(`${token.value} ${nextToken.value}: ${reason}`);
        index += 2;
      } else {
        index += 1;
      }

      continue;
    }

    if (!token.value.includes('=')) {
      if (!nextToken || nextToken.value.startsWith('--')) {
        const reason = _('This option requires a value.');
        addAnnotationIssue(annotationMap, token, reason);
        errors.push(`${token.value}: ${reason}`);
        index += 1;
        continue;
      }

      index += 2;
      continue;
    }

    index += 1;
  }

  if (!errors.length) {
    return { valid: true, message: '', annotations: [] };
  }

  return {
    valid: false,
    message: [getValidationHeaderText(), ...errors].join('\n'),
    annotations: finalizeAnnotations(annotationMap),
  };
}

export function addNfqwsRemoteValidationNeedleAnnotations(
  annotationMap: Map<
    string,
    { start: number; end: number; messages: string[] }
  >,
  tokens: RuntimeToken[],
  remoteValidation: RemoteValidationResult,
  needle: string,
): void {
  if (!needle.length) {
    return;
  }

  let matched = false;

  tokens.forEach((token) => {
    const tokenValue = token.value || '';
    const optionMatch =
      needle.startsWith('--') &&
      (tokenValue === needle || tokenValue.startsWith(`${needle}=`));
    const valueMatch =
      tokenValue === needle ||
      tokenValue.endsWith(`=${needle}`) ||
      (!needle.startsWith('--') && tokenValue.includes(`=${needle},`)) ||
      (!needle.startsWith('--') && tokenValue.endsWith(`=${needle}`));

    if (optionMatch || valueMatch) {
      addAnnotationIssue(annotationMap, token, remoteValidation.message);
      matched = true;
    }
  });

  if (matched) {
    return;
  }

  if (needle.startsWith('--')) {
    tokens
      .filter((token) => token.value && token.value.startsWith(needle))
      .forEach((token) =>
        addAnnotationIssue(annotationMap, token, remoteValidation.message),
      );
  }
}

export function addNfqwsRemoteValidationAnnotations(
  annotationMap: Map<
    string,
    { start: number; end: number; messages: string[] }
  >,
  tokens: RuntimeToken[],
  remoteValidation: RemoteValidationResult,
): void {
  const needles =
    remoteValidation &&
    Array.isArray(remoteValidation.needles) &&
    remoteValidation.needles.length
      ? remoteValidation.needles.map((needle) => `${needle}`)
      : remoteValidation && remoteValidation.needle
        ? [`${remoteValidation.needle}`]
        : [];

  needles.forEach((needle) =>
    addNfqwsRemoteValidationNeedleAnnotations(
      annotationMap,
      tokens,
      remoteValidation,
      needle,
    ),
  );
}

export function analyzeNfqwsStrategy(value: unknown): TextareaAnalysisResult {
  const localAnalysis = buildNfqwsLocalAnalysis(value);
  if (!localAnalysis.valid) {
    return localAnalysis;
  }

  const remoteValidation = getCachedNfqwsRemoteValidation(value);
  if (!remoteValidation || remoteValidation.valid) {
    return localAnalysis;
  }

  const text = value ? `${value}` : '';
  const tokens = parseNfqwsRuntimeTokens(text);
  const annotationMap = new Map<
    string,
    { start: number; end: number; messages: string[] }
  >();

  (localAnalysis.annotations || []).forEach((annotation: Annotation) =>
    addAnnotationIssue(annotationMap, annotation, annotation.message || ''),
  );
  addNfqwsRemoteValidationAnnotations(annotationMap, tokens, remoteValidation);

  return {
    valid: false,
    message: [getValidationHeaderText(), remoteValidation.message].join('\n'),
    annotations: finalizeAnnotations(annotationMap),
  };
}

export function getCachedNfqws2RemoteValidation(
  value: unknown,
): RemoteValidationResult | null {
  const normalized = normalizeNfqws2StrategyValue(value);
  return normalized.length
    ? nfqws2RemoteValidationCache.get(normalized) || null
    : null;
}

export function cacheNfqws2RemoteValidation(
  value: unknown,
  result: Partial<RemoteValidationResult> | null | undefined,
): RemoteValidationResult {
  const normalized = normalizeNfqws2StrategyValue(value);
  const cached: RemoteValidationResult = {
    valid: result?.valid === true,
    message: result?.message ? `${result.message}` : '',
    needle: result?.needle ? `${result.needle}` : '',
    needles: Array.isArray(result?.needles)
      ? result.needles.filter(Boolean).map((item) => `${item}`)
      : result?.needle
        ? [`${result.needle}`]
        : [],
  };

  if (normalized.length) {
    nfqws2RemoteValidationCache.set(normalized, cached);
  }

  return cached;
}

export function buildNfqws2RemoteValidationFallback(
  error?: any,
): RemoteValidationResult {
  const message = error?.message
    ? `${error.message}`
    : _('Unable to validate the NFQWS2 strategy through the backend parser.');

  return {
    valid: false,
    message: _('Backend validation failed: %s').format(message),
    needle: '',
    needles: [],
  };
}

export function validateNfqws2StrategyRemotely(
  value: unknown,
): Promise<RemoteValidationResult> {
  const normalized = normalizeNfqws2StrategyValue(value);

  if (!normalized.length) {
    return Promise.resolve({
      valid: true,
      message: '',
      needle: '',
      needles: [],
    });
  }

  if (nfqws2RemoteValidationCache.has(normalized)) {
    return Promise.resolve(nfqws2RemoteValidationCache.get(normalized)!);
  }

  if (nfqws2RemoteValidationInflight.has(normalized)) {
    return nfqws2RemoteValidationInflight.get(normalized)!;
  }

  const validationTask = (
    typeof fs !== 'undefined' && typeof fs.exec === 'function'
      ? fs.exec(NFQWS_VALIDATION_COMMAND, [
          'validate_nfqws2_strategy_json',
          normalized,
        ])
      : Promise.reject(new Error('fs.exec unavailable'))
  )
    .then((result: any) => {
      const payload = JSON.parse(
        (result && result.stdout ? result.stdout : '{}').trim() || '{}',
      );
      return cacheNfqws2RemoteValidation(normalized, {
        valid: payload.valid === true,
        message: payload.message || '',
        needle: payload.needle || '',
        needles: Array.isArray(payload.needles)
          ? payload.needles.filter(Boolean)
          : payload.needle
            ? [payload.needle]
            : [],
      });
    })
    .catch((error: unknown) =>
      cacheNfqws2RemoteValidation(
        normalized,
        buildNfqws2RemoteValidationFallback(error),
      ),
    )
    .finally(() => {
      nfqws2RemoteValidationInflight.delete(normalized);
    });

  nfqws2RemoteValidationInflight.set(normalized, validationTask);
  return validationTask;
}

export function buildNfqws2LocalAnalysis(
  value: unknown,
): TextareaAnalysisResult {
  const text = value ? `${value}` : '';
  if (!text.trim().length) {
    return {
      valid: false,
      message: _('NFQWS2 strategy cannot be empty'),
      annotations: [],
    };
  }

  const tokens = parseNfqwsRuntimeTokens(text);
  const annotationMap = new Map<
    string,
    { start: number; end: number; messages: string[] }
  >();
  const errors: string[] = [];

  for (let index = 0; index < tokens.length; ) {
    const token = tokens[index];
    const bareToken = token.value.includes('=')
      ? token.value.slice(0, token.value.indexOf('='))
      : token.value;
    const nextToken = tokens[index + 1] || null;

    const forbidden = getNfqws2ForbiddenTokenInfo(token.value, index);
    if (forbidden) {
      addAnnotationIssue(annotationMap, token, forbidden.reason);

      let displayToken = token.value;

      if (
        forbidden.captureNextValue &&
        nextToken &&
        !nextToken.value.startsWith('--')
      ) {
        addAnnotationIssue(annotationMap, nextToken, forbidden.reason);
        displayToken = `${displayToken} ${nextToken.value}`;
        index += 2;
      } else {
        index += 1;
      }

      errors.push(`${displayToken}: ${forbidden.reason}`);
      continue;
    }

    if (!token.value.startsWith('--')) {
      const reason = _(
        'Unexpected standalone token. Use explicit flags such as --name or --name=value.',
      );
      addAnnotationIssue(annotationMap, token, reason);
      errors.push(`${token.value}: ${reason}`);
      index += 1;
      continue;
    }

    const mode = getNfqws2OptionArgumentMode(bareToken);
    if (mode === 'unknown') {
      const reason = _('Unknown NFQWS2 flag.');
      addAnnotationIssue(annotationMap, token, reason);
      errors.push(`${token.value}: ${reason}`);
      index += 1;
      continue;
    }

    if (mode === 'none') {
      if (token.value.includes('=')) {
        const reason = _('This flag does not accept a value.');
        addAnnotationIssue(annotationMap, token, reason);
        errors.push(`${token.value}: ${reason}`);
      }

      index += 1;
      continue;
    }

    if (mode === 'optional') {
      if (
        nextToken &&
        !token.value.includes('=') &&
        !nextToken.value.startsWith('--')
      ) {
        const reason = _(
          "Optional values must be attached with '=' here; a separate token would be ignored by nfqws2.",
        );
        addAnnotationIssue(annotationMap, token, reason);
        addAnnotationIssue(annotationMap, nextToken, reason);
        errors.push(`${token.value} ${nextToken.value}: ${reason}`);
        index += 2;
      } else {
        index += 1;
      }

      continue;
    }

    if (!token.value.includes('=')) {
      if (!nextToken || nextToken.value.startsWith('--')) {
        const reason = _('This option requires a value.');
        addAnnotationIssue(annotationMap, token, reason);
        errors.push(`${token.value}: ${reason}`);
        index += 1;
        continue;
      }

      index += 2;
      continue;
    }

    index += 1;
  }

  if (!errors.length) {
    return { valid: true, message: '', annotations: [] };
  }

  return {
    valid: false,
    message: [getValidationHeaderText(), ...errors].join('\n'),
    annotations: finalizeAnnotations(annotationMap),
  };
}

export function analyzeNfqws2Strategy(value: unknown): TextareaAnalysisResult {
  const localAnalysis = buildNfqws2LocalAnalysis(value);
  if (!localAnalysis.valid) {
    return localAnalysis;
  }

  const remoteValidation = getCachedNfqws2RemoteValidation(value);
  if (!remoteValidation || remoteValidation.valid) {
    return localAnalysis;
  }

  const text = value ? `${value}` : '';
  const tokens = parseNfqwsRuntimeTokens(text);
  const annotationMap = new Map<
    string,
    { start: number; end: number; messages: string[] }
  >();

  (localAnalysis.annotations || []).forEach((annotation: Annotation) =>
    addAnnotationIssue(annotationMap, annotation, annotation.message || ''),
  );
  addNfqwsRemoteValidationAnnotations(annotationMap, tokens, remoteValidation);

  return {
    valid: false,
    message: [getValidationHeaderText(), remoteValidation.message].join('\n'),
    annotations: finalizeAnnotations(annotationMap),
  };
}

export function getCachedByedpiRemoteValidation(
  value: unknown,
): RemoteValidationResult | null {
  const normalized = normalizeByedpiStrategyValue(value);
  return normalized.length
    ? byedpiRemoteValidationCache.get(normalized) || null
    : null;
}

export function cacheByedpiRemoteValidation(
  value: unknown,
  result: Partial<RemoteValidationResult> | null | undefined,
): RemoteValidationResult {
  const normalized = normalizeByedpiStrategyValue(value);
  const cached: RemoteValidationResult = {
    valid: result?.valid === true,
    message: result?.message ? `${result.message}` : '',
    needle: result?.needle ? `${result.needle}` : '',
    needles: Array.isArray(result?.needles)
      ? result.needles.filter(Boolean).map((item) => `${item}`)
      : result?.needle
        ? [`${result.needle}`]
        : [],
  };

  if (normalized.length) {
    byedpiRemoteValidationCache.set(normalized, cached);
  }

  return cached;
}

export function buildByedpiRemoteValidationFallback(
  error?: any,
): RemoteValidationResult {
  const message = error?.message
    ? `${error.message}`
    : _('Unable to validate the ByeDPI strategy through the backend parser.');

  return {
    valid: false,
    message: _('Backend validation failed: %s').format(message),
    needle: '',
    needles: [],
  };
}

export function validateByedpiStrategyRemotely(
  value: unknown,
): Promise<RemoteValidationResult> {
  const normalized = normalizeByedpiStrategyValue(value);

  if (!normalized.length) {
    return Promise.resolve({
      valid: true,
      message: '',
      needle: '',
      needles: [],
    });
  }

  if (byedpiRemoteValidationCache.has(normalized)) {
    return Promise.resolve(byedpiRemoteValidationCache.get(normalized)!);
  }

  if (byedpiRemoteValidationInflight.has(normalized)) {
    return byedpiRemoteValidationInflight.get(normalized)!;
  }

  const validationTask = (
    typeof fs !== 'undefined' && typeof fs.exec === 'function'
      ? fs.exec(NFQWS_VALIDATION_COMMAND, [
          'validate_byedpi_strategy_json',
          normalized,
        ])
      : Promise.reject(new Error('fs.exec unavailable'))
  )
    .then((result: any) => {
      const payload = JSON.parse(
        (result && result.stdout ? result.stdout : '{}').trim() || '{}',
      );
      return cacheByedpiRemoteValidation(normalized, {
        valid: payload.valid === true,
        message: payload.message || '',
        needle: payload.needle || '',
        needles: Array.isArray(payload.needles)
          ? payload.needles.filter(Boolean)
          : payload.needle
            ? [payload.needle]
            : [],
      });
    })
    .catch((error: unknown) =>
      cacheByedpiRemoteValidation(
        normalized,
        buildByedpiRemoteValidationFallback(error),
      ),
    )
    .finally(() => {
      byedpiRemoteValidationInflight.delete(normalized);
    });

  byedpiRemoteValidationInflight.set(normalized, validationTask);
  return validationTask;
}

export function validateByedpiStrategyToken(
  token: string,
  nextToken: string | null,
): {
  valid: boolean;
  reason?: string;
  captureNextValue?: boolean;
  consumeNext?: boolean;
} {
  const controlled = getByedpiControlledTokenInfo(token);
  if (controlled && controlled.controlled) {
    return {
      valid: false,
      reason: controlled.reason,
      captureNextValue: (controlled as any).captureNextValue,
    };
  }

  if (/^--[^=]+=/.test(token)) {
    const base = token.split('=', 1)[0];
    const val = token.slice(base.length + 1);

    if (BYEDPI_LONG_VALUE_OPTIONS.has(base)) {
      return val.length
        ? { valid: true, consumeNext: false }
        : {
            valid: false,
            reason: _('ByeDPI option requires a value: %s').format(base),
            captureNextValue: false,
          };
    }

    if (BYEDPI_LONG_FLAG_OPTIONS.has(base)) {
      return {
        valid: false,
        reason: _('ByeDPI option does not accept a value: %s').format(base),
        captureNextValue: false,
      };
    }

    return {
      valid: false,
      reason: _('Unknown ByeDPI option: %s').format(base),
      captureNextValue: false,
    };
  }

  if (/^--.+/.test(token)) {
    if (BYEDPI_LONG_VALUE_OPTIONS.has(token)) {
      return nextToken && !byedpiTokenLooksLikeOption(nextToken)
        ? { valid: true, consumeNext: true }
        : {
            valid: false,
            reason: _('ByeDPI option requires a value: %s').format(token),
            captureNextValue: false,
          };
    }

    if (BYEDPI_LONG_FLAG_OPTIONS.has(token)) {
      return { valid: true, consumeNext: false };
    }

    return {
      valid: false,
      reason: _('Unknown ByeDPI option: %s').format(token),
      captureNextValue: false,
    };
  }

  if (/^-./.test(token)) {
    if (token === '-') {
      return {
        valid: false,
        reason: _('Unexpected ByeDPI strategy argument: %s').format(token),
        captureNextValue: false,
      };
    }

    const short = getByedpiShortOptionName(token) || token;
    const compactValue = token.slice(short.length);

    if (BYEDPI_SHORT_VALUE_OPTIONS.has(short)) {
      if (token === short) {
        return nextToken && !byedpiTokenLooksLikeOption(nextToken)
          ? { valid: true, consumeNext: true }
          : {
              valid: false,
              reason: _('ByeDPI option requires a value: %s').format(short),
              captureNextValue: false,
            };
      }

      return compactValue.length
        ? { valid: true, consumeNext: false }
        : {
            valid: false,
            reason: _('ByeDPI option requires a value: %s').format(short),
            captureNextValue: false,
          };
    }

    if (BYEDPI_SHORT_FLAG_OPTIONS.has(short)) {
      return token === short
        ? { valid: true, consumeNext: false }
        : {
            valid: false,
            reason: _(
              'ByeDPI option does not accept a compact value: %s',
            ).format(short),
            captureNextValue: false,
          };
    }

    return {
      valid: false,
      reason: _('Unknown ByeDPI option: %s').format(short),
      captureNextValue: false,
    };
  }

  return {
    valid: false,
    reason: _('Unexpected ByeDPI strategy argument: %s').format(token),
    captureNextValue: false,
  };
}

export function buildByedpiLocalAnalysis(
  value: unknown,
): TextareaAnalysisResult {
  const text = value ? `${value}` : '';
  if (!text.trim().length) {
    return {
      valid: false,
      message: _('ByeDPI strategy cannot be empty'),
      annotations: [],
    };
  }

  const tokens = parseNfqwsRuntimeTokens(text);
  const annotationMap = new Map<
    string,
    { start: number; end: number; messages: string[] }
  >();
  const errors: string[] = [];

  for (let index = 0; index < tokens.length; ) {
    const token = tokens[index];
    const nextToken = tokens[index + 1] || null;
    const tokenValidation = validateByedpiStrategyToken(
      token.value,
      nextToken ? nextToken.value : null,
    );

    if (tokenValidation.valid) {
      index += tokenValidation.consumeNext ? 2 : 1;
      continue;
    }

    addAnnotationIssue(annotationMap, token, tokenValidation.reason || '');
    let displayToken = token.value;

    if (
      tokenValidation.captureNextValue &&
      nextToken &&
      !nextToken.value.startsWith('-')
    ) {
      addAnnotationIssue(
        annotationMap,
        nextToken,
        tokenValidation.reason || '',
      );
      displayToken = `${displayToken} ${nextToken.value}`;
      index += 2;
    } else {
      index += 1;
    }

    errors.push(`${displayToken}: ${tokenValidation.reason || ''}`);
  }

  if (!errors.length) {
    return { valid: true, message: '', annotations: [] };
  }

  return {
    valid: false,
    message: [getValidationHeaderText(), ...errors].join('\n'),
    annotations: finalizeAnnotations(annotationMap),
  };
}

export function analyzeByedpiStrategy(value: unknown): TextareaAnalysisResult {
  const localAnalysis = buildByedpiLocalAnalysis(value);
  if (!localAnalysis.valid) {
    return localAnalysis;
  }

  const remoteValidation = getCachedByedpiRemoteValidation(value);
  if (!remoteValidation || remoteValidation.valid) {
    return localAnalysis;
  }

  const text = value ? `${value}` : '';
  const tokens = parseNfqwsRuntimeTokens(text);
  const annotationMap = new Map<
    string,
    { start: number; end: number; messages: string[] }
  >();

  (localAnalysis.annotations || []).forEach((annotation: Annotation) =>
    addAnnotationIssue(annotationMap, annotation, annotation.message || ''),
  );
  addNfqwsRemoteValidationAnnotations(annotationMap, tokens, remoteValidation);

  return {
    valid: false,
    message: [getValidationHeaderText(), remoteValidation.message].join('\n'),
    annotations: finalizeAnnotations(annotationMap),
  };
}

export function rejectStrategyValidation(
  option: any,
  section_id: string,
  message?: string,
): Promise<never> {
  const title = option.stripTags
    ? option.stripTags(option.title || '').trim()
    : option.title || '';
  const error =
    message ||
    (typeof option.getValidationError === 'function'
      ? option.getValidationError(section_id)
      : '') ||
    '';

  return Promise.reject(
    new TypeError(
      `${_('Option "%s" contains an invalid input value.').format(title || option.option)} ${error}`,
    ),
  );
}

export function parseStrategyWithRemoteValidation(
  this: any,
  section_id: string,
  config: {
    remoteValidate: (val: string) => Promise<RemoteValidationResult>;
    invalidMessage: string;
  },
): Promise<unknown> {
  const active =
    typeof this.isActive === 'function' ? this.isActive(section_id) : true;

  if (active) {
    if (typeof this.triggerValidation === 'function') {
      this.triggerValidation(section_id);
    }

    if (typeof this.isValid === 'function' && !this.isValid(section_id)) {
      return rejectStrategyValidation(
        this,
        section_id,
        typeof this.getValidationError === 'function'
          ? this.getValidationError(section_id)
          : undefined,
      );
    }

    const cval =
      typeof this.cfgvalue === 'function'
        ? this.cfgvalue(section_id)
        : undefined;
    const fval =
      typeof this.formvalue === 'function'
        ? this.formvalue(section_id)
        : undefined;
    const cvalString = cval == null ? '' : `${cval}`;
    const fvalString = fval == null ? '' : `${fval}`;
    const shouldWrite = this.forcewrite || cvalString !== fvalString;

    if (!shouldWrite) {
      return Promise.resolve();
    }

    return config.remoteValidate(fvalString).then((result) => {
      const textarea = getOptionTextarea(this, section_id);

      if (textarea) {
        refreshAnnotatedTextareaValidation(this, section_id, textarea);
      }

      if (typeof this.triggerValidation === 'function') {
        this.triggerValidation(section_id);
      }

      if (!result || result.valid !== true) {
        return rejectStrategyValidation(
          this,
          section_id,
          result && result.message ? result.message : config.invalidMessage,
        );
      }

      return Promise.resolve(
        typeof this.write === 'function'
          ? this.write(section_id, fvalString)
          : undefined,
      );
    });
  }

  if (!this.retain && typeof this.remove === 'function') {
    return Promise.resolve(this.remove(section_id));
  }

  return Promise.resolve();
}

export function parseNfqwsStrategyOnSave(
  this: any,
  section_id: string,
): Promise<unknown> {
  return parseStrategyWithRemoteValidation.call(this, section_id, {
    remoteValidate: validateNfqwsStrategyRemotely,
    invalidMessage: _(
      'Unable to validate the NFQWS strategy through the backend parser.',
    ),
  });
}

export function parseNfqws2StrategyOnSave(
  this: any,
  section_id: string,
): Promise<unknown> {
  return parseStrategyWithRemoteValidation.call(this, section_id, {
    remoteValidate: validateNfqws2StrategyRemotely,
    invalidMessage: _(
      'Unable to validate the NFQWS2 strategy through the backend parser.',
    ),
  });
}

export function attachNfqwsRemoteValidation(
  option: any,
  section_id: string,
  textarea: HTMLTextAreaElement & {
    __p99NfqwsRemoteValidationAttached?: boolean;
    __p99NfqwsRemoteValidationRequestId?: number;
    __p99NfqwsRemoteValidationTimer?: number | null;
  },
): void {
  if (!textarea || textarea.__p99NfqwsRemoteValidationAttached) {
    return;
  }

  textarea.__p99NfqwsRemoteValidationAttached = true;
  textarea.__p99NfqwsRemoteValidationRequestId = 0;
  textarea.__p99NfqwsRemoteValidationTimer = null;

  const runValidation = () => {
    const value = textarea.value;
    const localAnalysis = buildNfqwsLocalAnalysis(value);
    if (!localAnalysis.valid) {
      refreshAnnotatedTextareaValidation(option, section_id, textarea);
      return;
    }

    const requestId = (textarea.__p99NfqwsRemoteValidationRequestId || 0) + 1;
    textarea.__p99NfqwsRemoteValidationRequestId = requestId;

    validateNfqwsStrategyRemotely(value).then(() => {
      if (textarea.__p99NfqwsRemoteValidationRequestId !== requestId) {
        return;
      }

      refreshAnnotatedTextareaValidation(option, section_id, textarea);
    });
  };

  const scheduleValidation = (delay = NFQWS_REMOTE_VALIDATION_DEBOUNCE_MS) => {
    if (textarea.__p99NfqwsRemoteValidationTimer) {
      window.clearTimeout(textarea.__p99NfqwsRemoteValidationTimer);
    }

    textarea.__p99NfqwsRemoteValidationTimer = window.setTimeout(() => {
      textarea.__p99NfqwsRemoteValidationTimer = null;
      runValidation();
    }, delay);
  };

  textarea.addEventListener('input', () => scheduleValidation());
  textarea.addEventListener('change', () => scheduleValidation(0));
  textarea.addEventListener('blur', () => scheduleValidation(0));

  scheduleValidation(0);
}

export function attachNfqws2RemoteValidation(
  option: any,
  section_id: string,
  textarea: HTMLTextAreaElement & {
    __p99Nfqws2RemoteValidationAttached?: boolean;
    __p99Nfqws2RemoteValidationRequestId?: number;
    __p99Nfqws2RemoteValidationTimer?: number | null;
  },
): void {
  if (!textarea || textarea.__p99Nfqws2RemoteValidationAttached) {
    return;
  }

  textarea.__p99Nfqws2RemoteValidationAttached = true;
  textarea.__p99Nfqws2RemoteValidationRequestId = 0;
  textarea.__p99Nfqws2RemoteValidationTimer = null;

  const runValidation = () => {
    const value = textarea.value;
    const localAnalysis = buildNfqws2LocalAnalysis(value);
    if (!localAnalysis.valid) {
      refreshAnnotatedTextareaValidation(option, section_id, textarea);
      return;
    }

    const requestId = (textarea.__p99Nfqws2RemoteValidationRequestId || 0) + 1;
    textarea.__p99Nfqws2RemoteValidationRequestId = requestId;

    validateNfqws2StrategyRemotely(value).then(() => {
      if (textarea.__p99Nfqws2RemoteValidationRequestId !== requestId) {
        return;
      }

      refreshAnnotatedTextareaValidation(option, section_id, textarea);
    });
  };

  const scheduleValidation = (delay = NFQWS_REMOTE_VALIDATION_DEBOUNCE_MS) => {
    if (textarea.__p99Nfqws2RemoteValidationTimer) {
      window.clearTimeout(textarea.__p99Nfqws2RemoteValidationTimer);
    }

    textarea.__p99Nfqws2RemoteValidationTimer = window.setTimeout(() => {
      textarea.__p99Nfqws2RemoteValidationTimer = null;
      runValidation();
    }, delay);
  };

  textarea.addEventListener('input', () => scheduleValidation());
  textarea.addEventListener('change', () => scheduleValidation(0));
  textarea.addEventListener('blur', () => scheduleValidation(0));

  scheduleValidation(0);
}
