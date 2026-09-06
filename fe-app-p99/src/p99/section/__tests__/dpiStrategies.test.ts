import { describe, it, expect } from 'vitest';
import {
  getNfqwsOptionArgumentMode,
  getNfqws2OptionArgumentMode,
  getNfqwsForbiddenTokenInfo,
  normalizeNfqwsStrategyWhitespace,
  getByedpiControlledTokenInfo,
  byedpiTokenLooksLikeOption,
  getByedpiShortOptionName,
} from '../dpiStrategies';

describe('DPI strategies helpers', () => {
  describe('nfqws argument modes', () => {
    it('identifies required argument options', () => {
      expect(getNfqwsOptionArgumentMode('--dpi-desync')).toBe('required');
      expect(getNfqwsOptionArgumentMode('--filter-tcp')).toBe('required');
      expect(getNfqwsOptionArgumentMode('--qnum')).toBe('required');
    });

    it('identifies optional argument options', () => {
      expect(getNfqwsOptionArgumentMode('--dpi-desync-autottl')).toBe(
        'optional',
      );
      expect(getNfqwsOptionArgumentMode('--debug')).toBe('optional');
    });

    it('identifies no-argument options', () => {
      expect(getNfqwsOptionArgumentMode('--new')).toBe('none');
      expect(getNfqwsOptionArgumentMode('--dry-run')).toBe('none');
      expect(getNfqwsOptionArgumentMode('--daemon')).toBe('none');
    });

    it('returns unknown for unrecognized options', () => {
      expect(getNfqwsOptionArgumentMode('--unknown-option')).toBe('unknown');
    });
  });

  describe('nfqws2 argument modes', () => {
    it('identifies nfqws2 options', () => {
      expect(getNfqws2OptionArgumentMode('--lua-desync')).toBe('required');
      expect(getNfqws2OptionArgumentMode('--blob')).toBe('required');
      expect(getNfqws2OptionArgumentMode('--intercept')).toBe('optional');
      expect(getNfqws2OptionArgumentMode('--new')).toBe('optional');
      expect(getNfqws2OptionArgumentMode('--dry-run')).toBe('none');
    });
  });

  describe('forbidden tokens', () => {
    it('detects forbidden hostlists and config files', () => {
      expect(getNfqwsForbiddenTokenInfo('--config')).not.toBeNull();
      expect(getNfqwsForbiddenTokenInfo('--hostlist')).not.toBeNull();
      expect(getNfqwsForbiddenTokenInfo('<hostlist>')).not.toBeNull();
      expect(getNfqwsForbiddenTokenInfo('--qnum')).not.toBeNull();
      expect(getNfqwsForbiddenTokenInfo('--daemon')).not.toBeNull();
      expect(getNfqwsForbiddenTokenInfo('--dry-run')).not.toBeNull();
    });

    it('allows valid strategy options', () => {
      expect(getNfqwsForbiddenTokenInfo('--filter-tcp=80')).toBeNull();
      expect(getNfqwsForbiddenTokenInfo('--dpi-desync=fake')).toBeNull();
      expect(getNfqwsForbiddenTokenInfo('--new')).toBeNull();
    });
  });

  describe('whitespace normalization', () => {
    it('normalizes internal multiple spaces and trims', () => {
      expect(
        normalizeNfqwsStrategyWhitespace(
          '  --filter-tcp=80    --dpi-desync=fake \n --new  ',
        ),
      ).toBe('--filter-tcp=80 --dpi-desync=fake --new');
      expect(normalizeNfqwsStrategyWhitespace(null)).toBe('');
    });
  });

  describe('byedpi helpers', () => {
    it('checks option prefix and short names', () => {
      expect(byedpiTokenLooksLikeOption('-o')).toBe(true);
      expect(byedpiTokenLooksLikeOption('--auto')).toBe(true);
      expect(byedpiTokenLooksLikeOption('2')).toBe(false);
      expect(getByedpiShortOptionName('-o')).toBe('-o');
      expect(getByedpiShortOptionName('-o2')).toBe('-o');
      expect(getByedpiShortOptionName('--auto')).toBeNull();
    });

    it('detects controlled byedpi tokens (listen ip/port)', () => {
      expect(getByedpiControlledTokenInfo('-i').controlled).toBe(true);
      expect(getByedpiControlledTokenInfo('--port').controlled).toBe(true);
      expect(getByedpiControlledTokenInfo('-o').controlled).toBe(false);
    });
  });
});
