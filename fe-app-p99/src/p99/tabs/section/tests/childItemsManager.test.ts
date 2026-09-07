import { describe, expect, it } from 'vitest';
import {
  outboundJsonDisplayTag,
  outboundJsonListItemLabel,
  parseOutboundJsonObject,
  parseSubscriptionUrlEntry,
  validateSubscriptionUrlEntry,
} from '../childItemsManager';

describe('childItemsManager module', () => {
  it('parses subscription URL entries with optional labels', () => {
    const entry1 = parseSubscriptionUrlEntry('https://example.com/sub MySub');
    expect(entry1).toEqual({
      url: 'https://example.com/sub',
      label: 'MySub',
    });

    const entry2 = parseSubscriptionUrlEntry('https://example.com/sub');
    expect(entry2).toEqual({
      url: 'https://example.com/sub',
      label: 'https://example.com/sub',
    });

    const entry3 = parseSubscriptionUrlEntry('');
    expect(entry3).toEqual({
      url: '',
      label: '',
    });
  });

  it('validates subscription URL entries', () => {
    expect(validateSubscriptionUrlEntry('s1', '')).toBe(true);
    expect(
      validateSubscriptionUrlEntry('s1', 'https://valid.com/sub MySub'),
    ).toBe(true);
    expect(validateSubscriptionUrlEntry('s1', 'not-a-valid-url')).not.toBe(
      true,
    );
  });

  it('parses and extracts display tags from outbound JSON strings or objects', () => {
    const jsonStr = JSON.stringify({ tag: 'Proxy-1', type: 'vless' });
    expect(parseOutboundJsonObject(jsonStr)).toEqual({
      tag: 'Proxy-1',
      type: 'vless',
    });
    expect(outboundJsonDisplayTag(jsonStr)).toBe('Proxy-1');
    expect(outboundJsonListItemLabel(jsonStr)).toBe('Proxy-1 (vless)');

    expect(outboundJsonDisplayTag('invalid-json')).toBe('');
    expect(outboundJsonListItemLabel('invalid-json')).toBe('invalid-json');
  });
});
