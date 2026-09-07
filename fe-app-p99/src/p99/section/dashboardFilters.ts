export interface FilterChoice {
  value: string;
  label: string;
}

export function formatDashboardGroupLabel(name?: string): string {
  return `${name || ''}`.trim();
}

export function buildOutboundChoices(
  cachedOutbounds: (string | null | undefined)[] = [],
  draftOutbounds: (string | null | undefined)[] = [],
  selectedValues: (string | null | undefined)[] = [],
): FilterChoice[] {
  const seen = new Set<string>();
  const result: FilterChoice[] = [];

  const append = (name?: string | null) => {
    const value = `${name || ''}`.trim();
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    result.push({ value, label: value });
  };

  cachedOutbounds.forEach(append);
  draftOutbounds.forEach(append);
  selectedValues.forEach(append);

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildGroupChoices(
  urltestGroups: (string | null | undefined)[] = [],
  priorityGroups: (string | null | undefined)[] = [],
  selectedValues: (string | null | undefined)[] = [],
): FilterChoice[] {
  const seen = new Set<string>();
  const result: FilterChoice[] = [];

  const append = (name?: string | null) => {
    const value = formatDashboardGroupLabel(name ?? undefined);
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    result.push({ value, label: value });
  };

  urltestGroups.forEach(append);
  priorityGroups.forEach(append);
  selectedValues.forEach(append);

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function filterSignature(choices: FilterChoice[]): string {
  return choices.map((c) => `${c.value}:${c.label}`).join('|');
}
