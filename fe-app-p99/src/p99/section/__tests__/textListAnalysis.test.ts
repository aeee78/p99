import { describe, it, expect } from 'vitest';
import {
  parseCommentAwareListTokens,
  uniqueDomainTextValues,
  parseDomainTokenPrefix,
} from '../textListAnalysis';

describe('text list analysis helpers', () => {
  it('parses tokens with comment awareness (# and //)', () => {
    const input = `
# Comment line
example.com  # inline comment
google.com, youtube.com // slash comment
  sub.domain.org
`;
    const tokens = parseCommentAwareListTokens(input);
    const values = tokens.map((t) => t.value);
    expect(values).toEqual([
      'example.com',
      'google.com',
      'youtube.com',
      'sub.domain.org',
    ]);
  });

  it('filters unique domain text values case-insensitively', () => {
    const list = [
      'Example.com',
      'google.com',
      'EXAMPLE.COM',
      '  ',
      'google.com',
    ];
    expect(uniqueDomainTextValues(list)).toEqual(['Example.com', 'google.com']);
  });

  it('parses domain token prefixes', () => {
    expect(parseDomainTokenPrefix('domain:example.com')).toEqual({
      prefix: 'domain',
      value: 'example.com',
    });
    expect(parseDomainTokenPrefix('regex:^https?://')).toEqual({
      prefix: 'regex',
      value: '^https?://',
    });
    expect(parseDomainTokenPrefix('keyword:telegram')).toEqual({
      prefix: 'keyword',
      value: 'telegram',
    });
    expect(parseDomainTokenPrefix('plain.domain.com')).toEqual({
      prefix: '',
      value: 'plain.domain.com',
    });
  });
});
