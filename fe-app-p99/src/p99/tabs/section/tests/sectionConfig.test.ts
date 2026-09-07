import { describe, expect, it, vi } from 'vitest';
import {
  configureSectionSection,
  loadSectionTableOptions,
} from '../sectionConfig';
import type { LuciSection } from '../types';

describe('sectionConfig module', () => {
  it('cascades cleanup of child items on section removal', () => {
    const parentResult = { success: true };
    const handleRemoveMock = vi.fn().mockReturnValue(parentResult);
    const setLoaderMock = vi.fn();

    const sectionRef: LuciSection = {
      tab: vi.fn(),
      taboption: vi.fn(),
      option: vi.fn(),
      handleRemove: handleRemoveMock,
    };

    configureSectionSection(sectionRef, {
      setActionProvidersAvailabilityLoader: setLoaderMock,
      loadActionProvidersAvailability: vi.fn(),
    });

    expect(setLoaderMock).toHaveBeenCalledTimes(1);

    const event = { test: 123 };
    const result = sectionRef.handleRemove?.('parent-sec-id', event);

    expect(result).toBe(parentResult);
    expect(handleRemoveMock).toHaveBeenCalledWith('parent-sec-id', event);
  });

  it('loads options for active table sections', async () => {
    const cfgvalueMock = vi.fn();
    const loadMock = vi.fn().mockResolvedValue('loaded-val');

    const sectionRef: LuciSection = {
      tab: vi.fn(),
      taboption: vi.fn(),
      option: vi.fn(),
      cfgsections: () => ['sec1'],
      children: [
        {
          disable: false,
          modalonly: false,
          load: loadMock,
          cfgvalue: cfgvalueMock,
        },
        {
          disable: true,
          load: vi.fn(),
        },
      ],
    };

    await loadSectionTableOptions(sectionRef);

    expect(loadMock).toHaveBeenCalledWith('sec1');
    expect(cfgvalueMock).toHaveBeenCalledWith('sec1', 'loaded-val');
  });
});
