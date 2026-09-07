import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSectionContent,
  getActionOptionLabel,
  getRuleActionDisplayMarkup,
  getRuleActionDisplayValue,
  getRuleConfiguredAction,
  getRuleResolvedAction,
  populateActionOptionValues,
} from '../sectionContent';

describe('sectionContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any)._ = (text: string) => text;
    (globalThis as any).uci = {
      get: vi.fn(),
      set: vi.fn(),
      unset: vi.fn(),
      sections: vi.fn().mockReturnValue([]),
    };
    (globalThis as any).form = {
      Flag: class Flag {},
      Value: class Value {},
      ListValue: class ListValue {
        keylist: string[] = [];
        vallist: string[] = [];
        value(val: string, label: string) {
          if (!this.keylist) this.keylist = [];
          if (!this.vallist) this.vallist = [];
          this.keylist.push(val);
          this.vallist.push(label);
        }
      },
      DynamicList: class DynamicList {},
      TextValue: class TextValue {},
      DummyValue: class DummyValue {},
    };
  });

  it('correctly maps rule action labels and display values', () => {
    expect(getActionOptionLabel('block')).toBe('Block');
    expect(getActionOptionLabel('bypass')).toBe('Direct / Bypass');
    expect(getActionOptionLabel('connection')).toBe('Proxy (sing-box)');
    expect(getActionOptionLabel('dns')).toBe('DNS');
    expect(getActionOptionLabel('zapret')).toBe('Zapret (DPI)');
    expect(getActionOptionLabel('zapret2')).toBe('Zapret2 (DPI)');
    expect(getActionOptionLabel('byedpi')).toBe('ByeDPI');

    vi.mocked((globalThis as any).uci.get).mockReturnValue('zapret');
    expect(getRuleConfiguredAction('s1')).toBe('zapret');
    expect(getRuleResolvedAction('s1')).toBe('zapret');
    expect(getRuleActionDisplayValue('s1')).toBe('Zapret');
    expect(getRuleActionDisplayMarkup('s1')).toBe('Zapret');

    vi.mocked((globalThis as any).uci.get).mockReturnValue(undefined);
    expect(getRuleConfiguredAction('s2')).toBeNull();
    expect(getRuleResolvedAction('s2')).toBe('connection');
    expect(getRuleActionDisplayValue('s2')).toBe('Proxy (sing-box)');
  });

  it('populates action option values', () => {
    const listOption = new (globalThis as any).form.ListValue();
    populateActionOptionValues(listOption);
    expect(listOption.keylist).toContain('connection');
    expect(listOption.keylist).toContain('bypass');
    expect(listOption.keylist).toContain('block');
    expect(listOption.keylist).toContain('dns');
  });

  it('registers tabs and options on section Ref', () => {
    const tabs: Record<string, string> = {};
    const tabOptions: Array<{ tab: string; type: any; name: string }> = [];

    const mockSection = {
      tab(name: string, title: string) {
        tabs[name] = title;
      },
      taboption(tab: string, type: any, name: string) {
        tabOptions.push({ tab, type, name });
        return {
          depends: vi.fn(),
          value: vi.fn(),
        };
      },
    };

    createSectionContent(mockSection);

    expect(tabs.settings).toBe('General');
    expect(tabs.conditions).toBe('Rules & Traffic');
    expect(tabs.clients).toBe('Clients & Devices');
    expect(tabs.advanced).toBe('Advanced');

    const names = tabOptions.map((o) => o.name);
    expect(names).toContain('enabled');
    expect(names).toContain('_action_display');
    expect(names).toContain('label');
    expect(names).toContain('action');
    expect(names).toContain('dns_type');
    expect(names).toContain('dns_server');
    expect(names).toContain('selector_proxy_links');
    expect(names).toContain('subscription_url');
    expect(names).toContain('subscription');
    expect(names).toContain('interfaces');
    expect(names).toContain('urltest');
    expect(names).toContain('priority_group');
    expect(names).toContain('domain');
    expect(names).toContain('ip_cidr');
    expect(names).toContain('community_lists');
    expect(names).toContain('secondary_rule_sets');
    expect(names).toContain('rule_set');
    expect(names).toContain('_dns_rule_set');
    expect(names).toContain('domain_ip_lists');
    expect(names).toContain('_dns_domain_ip_lists');
    expect(names).toContain('source_ip_cidr');
    expect(names).toContain('fully_routed_ips');
    expect(names).toContain('excluded_source_ip_cidr');
    expect(names).toContain('ports');
  });
});
