import { describe, it, expect } from 'vitest';
import {
  isSingBoxDuration,
  validateOptionalSingBoxDuration,
  validateRequiredSingBoxDuration,
} from '../duration';

describe('section duration helpers', () => {
  it('accepts valid duration strings', () => {
    const valid = ['1s', '0.5s', '2m30s', '10ms', '1h', '2d', '500us', '100ns'];
    for (const val of valid) {
      expect(isSingBoxDuration(val)).toBe(true);
    }
  });

  it('rejects zero, negative or invalid durations', () => {
    const invalid = [
      '0s',
      '0h0m',
      '0.0s',
      '-1s',
      'abc',
      '10',
      '',
      ' ',
      null,
      undefined,
    ];
    for (const val of invalid) {
      expect(isSingBoxDuration(val)).toBe(false);
    }
  });

  it('validates optional sing-box duration', () => {
    expect(validateOptionalSingBoxDuration('')).toBe(true);
    expect(validateOptionalSingBoxDuration('   ')).toBe(true);
    expect(validateOptionalSingBoxDuration('30m')).toBe(true);
    expect(validateOptionalSingBoxDuration('0s')).toBe(
      'Use sing-box duration format like 1d, 12h or 30m',
    );
  });

  it('validates required sing-box duration', () => {
    expect(validateRequiredSingBoxDuration('20m')).toBe(true);
    expect(validateRequiredSingBoxDuration('')).toBe(
      'Use sing-box duration format like 1d, 12h or 30m',
    );
    expect(validateRequiredSingBoxDuration('invalid')).toBe(
      'Use sing-box duration format like 1d, 12h or 30m',
    );
  });
});
