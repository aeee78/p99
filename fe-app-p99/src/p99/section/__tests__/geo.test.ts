import { describe, expect, it } from 'vitest';
import {
  COUNTRY_CODES,
  countryChoices,
  getCountryFlagEmoji,
  getCountryOptionLabel,
  getRegionDisplayName,
  serverCountryDetectionChoices,
  validateCountryCode,
} from '../geo';

describe('geo helper module', () => {
  it('converts ISO country codes into flag emojis', () => {
    expect(getCountryFlagEmoji('US')).toBe('🇺🇸');
    expect(getCountryFlagEmoji('DE')).toBe('🇩🇪');
    expect(getCountryFlagEmoji('RU')).toBe('🇷🇺');
    expect(getCountryFlagEmoji('xk')).toBe('🇽🇰');
    expect(getCountryFlagEmoji('invalid')).toBe('');
    expect(getCountryFlagEmoji('')).toBe('');
    expect(getCountryFlagEmoji(undefined)).toBe('');
  });

  it('provides fallbacks for region display names', () => {
    expect(getRegionDisplayName('XK', 'en')).toBe('Kosovo');
    expect(getRegionDisplayName('US', 'en')).toBe('United States');
  });

  it('formats country option labels with emoji and name', () => {
    const label = getCountryOptionLabel('DE', 'en');
    expect(label).toContain('🇩🇪');
    expect(label).toContain('Germany');
  });

  it('validates single and array country codes against standard list', () => {
    expect(validateCountryCode('s1', 'US')).toBe(true);
    expect(validateCountryCode('s1', ['US', 'DE', 'FR'])).toBe(true);
    expect(validateCountryCode('s1', '')).toBe(true);
    expect(validateCountryCode('s1', [])).toBe(true);
    expect(validateCountryCode('s1', 'ZZ')).toBe('Unknown country');
    expect(validateCountryCode('s1', ['US', 'UNKNOWN'])).toBe(
      'Unknown country',
    );
  });

  it('builds sorted country choices containing all country codes', () => {
    const choices = countryChoices();
    expect(choices.length).toBe(COUNTRY_CODES.length);
    expect(choices[0].value).toBeDefined();
    expect(choices[0].label).toBeDefined();
    for (let i = 1; i < choices.length; i++) {
      expect(
        choices[i].label.localeCompare(choices[i - 1].label),
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('provides server country detection choices', () => {
    const detection = serverCountryDetectionChoices();
    expect(detection).toEqual([
      { value: 'flag_emoji', label: 'Flag emoji in name' },
      { value: 'country_is', label: 'Via country.is' },
    ]);
  });
});
