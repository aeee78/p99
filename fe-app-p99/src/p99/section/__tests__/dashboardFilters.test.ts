import { describe, expect, it } from 'vitest';
import {
  buildGroupChoices,
  buildOutboundChoices,
  filterSignature,
  formatDashboardGroupLabel,
} from '../dashboardFilters';

describe('dashboardFilters helper module', () => {
  it('formats group labels cleanly without extraneous whitespace', () => {
    expect(formatDashboardGroupLabel('  Group 1  ')).toBe('Group 1');
    expect(formatDashboardGroupLabel(undefined)).toBe('');
    expect(formatDashboardGroupLabel(null as unknown as string)).toBe('');
  });

  it('builds, deduplicates, and sorts outbound choices alphabetically', () => {
    const cached = ['Node B', 'Node A'];
    const drafts = ['Node C', 'Node A'];
    const selected = ['Node D', '   ', ''];

    const choices = buildOutboundChoices(cached, drafts, selected);
    expect(choices).toEqual([
      { value: 'Node A', label: 'Node A' },
      { value: 'Node B', label: 'Node B' },
      { value: 'Node C', label: 'Node C' },
      { value: 'Node D', label: 'Node D' },
    ]);
  });

  it('builds, deduplicates, and sorts group choices from urltest and priority sources', () => {
    const urltest = ['Auto Group', 'Failover'];
    const priority = ['Backup', 'Auto Group'];
    const selected = ['Custom Group'];

    const choices = buildGroupChoices(urltest, priority, selected);
    expect(choices).toEqual([
      { value: 'Auto Group', label: 'Auto Group' },
      { value: 'Backup', label: 'Backup' },
      { value: 'Custom Group', label: 'Custom Group' },
      { value: 'Failover', label: 'Failover' },
    ]);

    // Ensure labels match values and do NOT contain URLTest: or Priority: prefix
    choices.forEach((choice) => {
      expect(choice.label).toBe(choice.value);
      expect(choice.label).not.toMatch(/^(URLTest|Priority):/);
    });
  });

  it('computes consistent choice signature for caching and diffing', () => {
    const choices = [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
    ];
    expect(filterSignature(choices)).toBe('A:A|B:B');
  });
});
