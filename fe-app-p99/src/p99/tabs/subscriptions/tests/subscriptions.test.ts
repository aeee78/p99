import { describe, expect, it } from 'vitest';
import { getUrlHostname, validateSubscriptionUrl } from '../subscriptions';

describe('subscriptions tab logic', () => {
  describe('getUrlHostname', () => {
    it('extracts hostname from valid URLs', () => {
      expect(getUrlHostname('https://example.com/sub/token')).toBe(
        'example.com',
      );
      expect(getUrlHostname('http://sub.my-domain.org:8080/api')).toBe(
        'sub.my-domain.org',
      );
    });

    it('falls back to string for invalid URLs or empty input', () => {
      expect(getUrlHostname('')).toBe('');
      expect(getUrlHostname('not-a-valid-url')).toBe('not-a-valid-url');
      expect(getUrlHostname(null)).toBe('');
    });
  });

  describe('validateSubscriptionUrl', () => {
    it('returns error when subscription URL is empty', () => {
      const res = validateSubscriptionUrl('');
      expect(res).not.toBe(true);
      expect(typeof res).toBe('string');
    });

    it('returns true for valid HTTP/HTTPS URLs', () => {
      expect(
        validateSubscriptionUrl('https://example.com/api/v1/client/subscribe'),
      ).toBe(true);
      expect(validateSubscriptionUrl('http://192.168.1.1:8080/sub')).toBe(true);
    });

    it('rejects invalid or unsupported URLs', () => {
      expect(validateSubscriptionUrl('ftp://example.com')).not.toBe(true);
      expect(validateSubscriptionUrl('random text')).not.toBe(true);
    });
  });
});
