import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  configureGridSection,
  getRuleEditButtonText,
  renderP99View,
} from '../p99View';
import type { LuciSection } from '../../tabs/settings/types';

describe('p99View orchestrator', () => {
  beforeAll(() => {
    Object.assign(globalThis, {
      _: (s: string) => s,
      uci: {
        get: vi.fn((_pkg, sec, opt) => (opt === 'label' ? `Label_${sec}` : '')),
      },
      form: {
        Value: class {},
        Flag: class {},
        ListValue: class {},
        DynamicList: class {},
        TypedSection: class {},
        GridSection: class {},
        TableSection: class {},
        Map: class {
          tabbed = false;
          handleSaveApply?: () => Promise<unknown>;
          sections: Record<string, LuciSection> = {};
          section(_type: unknown, name: string) {
            const sec: LuciSection = {
              option: vi.fn(),
            };
            this.sections[name] = sec;
            return sec;
          }
          render() {
            return Promise.resolve({ tagName: 'DIV' });
          }
        },
      },
      ui: {
        addValidator: vi.fn(),
      },
    });
  });

  it('getRuleEditButtonText returns label or fallback Edit', () => {
    expect(getRuleEditButtonText()).toBe('Edit');
  });

  it('configureGridSection sets up properties, modaltitle, and sectiontitle', () => {
    const sec: LuciSection = {
      option: vi.fn(),
    };

    configureGridSection(sec, 'section', 'Section Title', 'Add New Section');

    expect(sec.anonymous).toBe(false);
    expect(sec.addremove).toBe(true);
    expect(sec.sortable).toBe(true);
    expect(sec.rowcolors).toBe(true);
    expect(sec.nodescriptions).toBe(true);

    // modaltitle with section_id
    expect(sec.modaltitle?.('sec123')).toBe('Section Title: Label_sec123');
    // modaltitle without section_id
    expect(sec.modaltitle?.('')).toBe('Add New Section');

    // sectiontitle
    expect(sec.sectiontitle?.('sec123')).toBe('Label_sec123');

    // row actions for section type
    expect(typeof sec.renderRowActions).toBe('function');
  });

  it('renderP99View configures all 7 tab sections and calls render', async () => {
    const mockDeps = {
      dashboard: { createDashboardContent: vi.fn() },
      section: {
        configureSectionSection: vi.fn(),
        createSectionContent: vi.fn(),
      },
      subscriptions: {
        configureSubscriptionsSection: vi.fn(),
        createSubscriptionsContent: vi.fn(),
      },
      settings: { createSettingsContent: vi.fn() },
      diagnostic: { createDiagnosticContent: vi.fn() },
      monitoring: { createMonitoringContent: vi.fn() },
      updates: { createUpdatesContent: vi.fn() },
    };

    const rendered = await renderP99View(mockDeps);
    expect(rendered).toEqual({ tagName: 'DIV' });

    expect(mockDeps.dashboard.createDashboardContent).toHaveBeenCalled();
    expect(mockDeps.section.configureSectionSection).toHaveBeenCalled();
    expect(mockDeps.section.createSectionContent).toHaveBeenCalled();
    expect(
      mockDeps.subscriptions.configureSubscriptionsSection,
    ).toHaveBeenCalled();
    expect(
      mockDeps.subscriptions.createSubscriptionsContent,
    ).toHaveBeenCalled();
    expect(mockDeps.settings.createSettingsContent).toHaveBeenCalled();
    expect(mockDeps.diagnostic.createDiagnosticContent).toHaveBeenCalled();
    expect(mockDeps.monitoring.createMonitoringContent).toHaveBeenCalled();
    expect(mockDeps.updates.createUpdatesContent).toHaveBeenCalled();
  });
});
