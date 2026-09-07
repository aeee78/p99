import { describe, expect, it } from 'vitest';
import {
  getDefaultOutboundDetourSection,
  getOutboundDetourTargetSections,
  getUciSectionLabel,
  getUciSectionName,
  isDnsDetourTargetSection,
  isOutboundDetourTargetSection,
  refreshDnsDetourSectionOptionValues,
  refreshOutboundDetourSectionOptionValues,
  type DetourOptionTarget,
  type UciSectionLike,
} from '../detours';

describe('detours helper module', () => {
  const sections: UciSectionLike[] = [
    { '.name': 'sec1', label: 'First Section', action: 'proxy', enabled: '1' },
    {
      '.name': 'sec2',
      label: 'Second Section',
      action: 'connection',
      enabled: '1',
    },
    {
      '.name': 'sec_disabled',
      label: 'Disabled',
      action: 'outbound',
      enabled: '0',
    },
    { '.name': 'sec_dns', label: 'DNS Section', action: 'dns', enabled: '1' },
    {
      '.name': 'sec_zapret',
      label: 'Zapret Section',
      action: 'zapret',
      enabled: '1',
    },
    {
      '.name': 'sec_byedpi',
      label: 'ByeDPI Section',
      action: 'byedpi',
      enabled: '1',
    },
  ];

  it('correctly extracts section name and label', () => {
    expect(getUciSectionName({ '.name': 'foo' })).toBe('foo');
    expect(getUciSectionName({ name: 'bar' })).toBe('bar');
    expect(getUciSectionName('baz')).toBe('baz');
    expect(getUciSectionName(null)).toBe('');

    expect(getUciSectionLabel({ '.name': 's1', label: 'My Section' })).toBe(
      'My Section',
    );
    expect(getUciSectionLabel({ '.name': 's1' })).toBe('s1');
  });

  it('filters outbound detour targets excluding self and non-outbound actions', () => {
    expect(isOutboundDetourTargetSection(sections[0], 'sec2')).toBe(true);
    // Self
    expect(isOutboundDetourTargetSection(sections[0], 'sec1')).toBe(false);
    // Disabled
    expect(isOutboundDetourTargetSection(sections[2], 'sec1')).toBe(false);
    // DNS is not an outbound action
    expect(isOutboundDetourTargetSection(sections[3], 'sec1')).toBe(false);
    // Null
    expect(isOutboundDetourTargetSection(null, 'sec1')).toBe(false);
  });

  it('retrieves outbound target sections and default target', () => {
    const targets = getOutboundDetourTargetSections('sec1', sections);
    expect(targets.map((s) => s['.name'])).toEqual(['sec2']);
    expect(getDefaultOutboundDetourSection('sec1', sections)).toBe('sec2');
    expect(getDefaultOutboundDetourSection('unknown', sections)).toBe('sec1');
  });

  it('refreshes outbound detour option choices', () => {
    const values: Record<string, string> = {};
    const option: DetourOptionTarget = {
      value: (key, label) => {
        values[key] = label || key;
      },
    };

    refreshOutboundDetourSectionOptionValues(option, 'sec1', sections);
    expect(values).toEqual({ sec2: 'Second Section' });
  });

  it('checks DNS detour target eligibility based on provider availability', () => {
    // Normal outbound actions are always eligible
    expect(isDnsDetourTargetSection(sections[0], 'other', {})).toBe(true);
    // Self is excluded
    expect(isDnsDetourTargetSection(sections[0], 'sec1', {})).toBe(false);
    // Zapret requires isZapretInstalled
    expect(
      isDnsDetourTargetSection(sections[4], 'other', {
        isZapretInstalled: false,
      }),
    ).toBe(false);
    expect(
      isDnsDetourTargetSection(sections[4], 'other', {
        isZapretInstalled: true,
      }),
    ).toBe(true);
    // ByeDPI requires isByedpiInstalled
    expect(
      isDnsDetourTargetSection(sections[5], 'other', {
        isByedpiInstalled: false,
      }),
    ).toBe(false);
    expect(
      isDnsDetourTargetSection(sections[5], 'other', {
        isByedpiInstalled: true,
      }),
    ).toBe(true);
  });

  it('refreshes DNS detour option choices', () => {
    const values: Record<string, string> = {};
    const option: DetourOptionTarget = {
      value: (key, label) => {
        values[key] = label || key;
      },
    };

    refreshDnsDetourSectionOptionValues(option, 'sec1', sections, {
      isZapretInstalled: true,
    });
    expect(values).toEqual({
      sec2: 'Second Section',
      sec_zapret: 'Zapret Section',
    });
  });
});
