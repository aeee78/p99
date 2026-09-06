/**
 * Ruleset utilities, URL builders, and reference validators for primary and secondary rulesets.
 */

import {
  SECONDARY_RULESET_OPTIONS,
  DOMAIN_LIST_OPTIONS,
} from '../../constants';
import { validateUrl } from '../../validators/validateUrl';
import { validatePath } from '../../validators/validatePath';

export const SECONDARY_RULESET_RAW_PREFIX =
  'https://raw.githubusercontent.com/Greeg0ry/b4geoip-p99/main/srs/';
export const SECONDARY_RULESET_CDN_PREFIX =
  'https://cdn.jsdelivr.net/gh/Greeg0ry/b4geoip-p99@main/srs/';

export function secondaryRulesetUrl(value: string): string {
  return `${SECONDARY_RULESET_RAW_PREFIX}${value}.srs`;
}

export function secondaryRulesetId(
  reference: unknown,
  secondaryOptions: Record<string, string> = SECONDARY_RULESET_OPTIONS,
): string {
  const value = `${reference || ''}`;
  const prefix = value.startsWith(SECONDARY_RULESET_RAW_PREFIX)
    ? SECONDARY_RULESET_RAW_PREFIX
    : value.startsWith(SECONDARY_RULESET_CDN_PREFIX)
      ? SECONDARY_RULESET_CDN_PREFIX
      : '';
  if (!prefix || !value.endsWith('.srs')) return '';
  const id = value.slice(prefix.length, -4);
  return Object.prototype.hasOwnProperty.call(secondaryOptions, id) ? id : '';
}

export function isBuiltinRulesetValue(
  value: string,
  domainListOptions: Record<string, string> = DOMAIN_LIST_OPTIONS,
): boolean {
  return Object.prototype.hasOwnProperty.call(domainListOptions, value);
}

export function normalizeReferenceForExtensionCheck(
  reference: unknown,
): string {
  const value = `${reference || ''}`.trim();
  const queryIndex = value.indexOf('?');
  const withoutQuery = queryIndex >= 0 ? value.slice(0, queryIndex) : value;
  const hashIndex = withoutQuery.indexOf('#');
  return hashIndex >= 0 ? withoutQuery.slice(0, hashIndex) : withoutQuery;
}

export function hasAllowedReferenceExtension(
  value: unknown,
  extensions: string[],
): boolean {
  const normalized = normalizeReferenceForExtensionCheck(value);
  return extensions.some((extension) => normalized.endsWith(extension));
}

export interface ValidateFileReferenceOptions {
  allowRemoteWithoutExtension?: boolean;
}

export function validateFileReference(
  value: unknown,
  extensions: string[],
  errorMessage: string,
  options: ValidateFileReferenceOptions = {},
): true | string {
  const str = typeof value === 'string' ? value.trim() : '';
  if (!str.length) {
    return true;
  }

  if (str.startsWith('http://') || str.startsWith('https://')) {
    const validation = validateUrl(str);
    if (
      validation.valid &&
      (options.allowRemoteWithoutExtension ||
        hasAllowedReferenceExtension(str, extensions))
    ) {
      return true;
    }
    return errorMessage;
  }

  if (str.startsWith('/')) {
    const validation = validatePath(str);
    if (validation.valid && hasAllowedReferenceExtension(str, extensions)) {
      return true;
    }
    return errorMessage;
  }

  return errorMessage;
}

export function validateCustomRulesetReference(
  value: unknown,
  errorMessage = 'Rule set must be an HTTP(S) URL or a local .srs / .json path',
): true | string {
  return validateFileReference(value, ['.srs', '.json'], errorMessage, {
    allowRemoteWithoutExtension: true,
  });
}

export function validatePlainListReference(
  value: unknown,
  errorMessage = 'List must be an HTTP(S) URL or a local .lst path',
): true | string {
  return validateFileReference(value, ['.lst'], errorMessage, {
    allowRemoteWithoutExtension: true,
  });
}
