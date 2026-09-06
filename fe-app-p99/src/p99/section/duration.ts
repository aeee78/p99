/**
 * Duration parsing and validation for sing-box duration fields (e.g., '10s', '1m', '2m30s').
 */

const SING_BOX_DURATION_REGEX =
  /^(?=.*[1-9])([0-9]+(?:\.[0-9]+)?(?:ns|us|ms|s|m|h|d))+$/;

export function isSingBoxDuration(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return SING_BOX_DURATION_REGEX.test(value.trim());
}

export function validateOptionalSingBoxDuration(
  value: unknown,
  errorMessage = 'Use sing-box duration format like 1d, 12h or 30m',
): true | string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized.length) {
    return true;
  }
  if (isSingBoxDuration(normalized)) {
    return true;
  }
  return errorMessage;
}

export function validateRequiredSingBoxDuration(
  value: unknown,
  errorMessage = 'Use sing-box duration format like 1d, 12h or 30m',
): true | string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized.length) {
    return errorMessage;
  }
  if (isSingBoxDuration(normalized)) {
    return true;
  }
  return errorMessage;
}
