import {
  DEFAULT_LATENCY_TEST_URL,
  LATENCY_TEST_URL_OPTIONS,
} from '../../../constants';
import { validateUrl } from '../../../validators/validateUrl';

export function latencyTestUrlChoices(): string[] {
  return Array.isArray(LATENCY_TEST_URL_OPTIONS)
    ? LATENCY_TEST_URL_OPTIONS
    : [DEFAULT_LATENCY_TEST_URL || 'https://www.gstatic.com/generate_204'];
}

export function validateLatencyTestUrl(value: unknown): boolean | string {
  const normalized = `${value ?? ''}`.trim();
  const validation = validateUrl(normalized);
  return validation.valid ? true : validation.message || 'Invalid URL';
}
