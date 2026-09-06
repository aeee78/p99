import { describe, it, expect } from 'vitest';
import {
  secondaryRulesetUrl,
  secondaryRulesetId,
  isBuiltinRulesetValue,
  hasAllowedReferenceExtension,
  validateCustomRulesetReference,
  validatePlainListReference,
  SECONDARY_RULESET_RAW_PREFIX,
  SECONDARY_RULESET_CDN_PREFIX,
} from '../rulesets';

describe('section rulesets helpers', () => {
  it('builds secondary ruleset URL', () => {
    expect(secondaryRulesetUrl('blizzard')).toBe(
      `${SECONDARY_RULESET_RAW_PREFIX}blizzard.srs`,
    );
  });

  it('parses secondary ruleset ID from raw or cdn URL', () => {
    expect(
      secondaryRulesetId(`${SECONDARY_RULESET_RAW_PREFIX}blizzard.srs`),
    ).toBe('blizzard');
    expect(secondaryRulesetId(`${SECONDARY_RULESET_CDN_PREFIX}valve.srs`)).toBe(
      'valve',
    );
    expect(secondaryRulesetId('https://example.com/custom.srs')).toBe('');
  });

  it('checks built-in ruleset values', () => {
    expect(isBuiltinRulesetValue('russia_inside')).toBe(true);
    expect(isBuiltinRulesetValue('youtube')).toBe(true);
    expect(isBuiltinRulesetValue('unknown_nonexistent')).toBe(false);
  });

  it('checks allowed extensions ignoring query and hash', () => {
    expect(hasAllowedReferenceExtension('rule.srs?v=1#hash', ['.srs'])).toBe(
      true,
    );
    expect(hasAllowedReferenceExtension('rule.json', ['.srs', '.json'])).toBe(
      true,
    );
    expect(hasAllowedReferenceExtension('rule.txt', ['.srs', '.json'])).toBe(
      false,
    );
  });

  it('validates custom ruleset references', () => {
    expect(validateCustomRulesetReference('')).toBe(true);
    expect(
      validateCustomRulesetReference('https://example.com/rules.srs'),
    ).toBe(true);
    expect(validateCustomRulesetReference('/etc/p99/local.srs')).toBe(true);
    expect(
      validateCustomRulesetReference('ftp://invalid.example/rules.srs'),
    ).not.toBe(true);
    expect(validateCustomRulesetReference('/etc/p99/local.exe')).not.toBe(true);
  });

  it('validates plain list references', () => {
    expect(validatePlainListReference('')).toBe(true);
    expect(validatePlainListReference('https://example.com/list.lst')).toBe(
      true,
    );
    expect(validatePlainListReference('/etc/p99/domains.lst')).toBe(true);
    expect(validatePlainListReference('/etc/p99/domains.srs')).not.toBe(true);
  });
});
