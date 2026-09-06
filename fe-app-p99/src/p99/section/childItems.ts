/**
 * Child items cascading, dynamic list normalizers and settings serialization.
 */

export function normalizeDynamicListItems(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => `${item}`.trim())
      .filter(Boolean);
  }
  return `${value}`
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueDynamicListItems(value: unknown): string[] {
  return Array.from(new Set(normalizeDynamicListItems(value)));
}

export function childOwnerOption(ownerOption?: string): string {
  return ownerOption || 'section';
}

export function childItemOrder(item: unknown): number {
  const record =
    item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
  const value = record ? record.order : null;
  const parsed = Number.parseInt(value == null ? '0' : `${value}`, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compactItemSettings(values: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const record =
    values && typeof values === 'object'
      ? (values as Record<string, unknown>)
      : {};

  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      const items = value
        .map((item) => `${item || ''}`.trim())
        .filter((item) => item.length > 0);

      if (items.length) {
        result[key] = items;
      }
      return;
    }

    result[key] = `${value}`;
  });

  return result;
}

export function cleanFormSectionData(
  sectionData: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!sectionData || typeof sectionData !== 'object') {
    return result;
  }

  Object.entries(sectionData).forEach(([key, value]) => {
    if (key.startsWith('.')) return;
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  });

  return result;
}
