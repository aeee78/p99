import { describe, expect, it } from 'vitest';
import {
  dnsTypeChoices,
  formatStackedValidationMessages,
  getModalTabs,
  MODAL_TAB_IDS,
  STACKED_SETTINGS_VALIDATION_SUMMARY_CLASS,
} from '../modalTabs';

describe('modalTabs helper module', () => {
  it('returns the four standard modal tab definitions', () => {
    const tabs = getModalTabs();
    expect(tabs.map((t) => t.id)).toEqual([
      MODAL_TAB_IDS.SETTINGS,
      MODAL_TAB_IDS.CONDITIONS,
      MODAL_TAB_IDS.CLIENTS,
      MODAL_TAB_IDS.ADVANCED,
    ]);
    expect(tabs.map((t) => t.label)).toEqual([
      'General',
      'Rules & Traffic',
      'Clients & Devices',
      'Advanced',
    ]);
  });

  it('provides dns type choices for network interfaces', () => {
    const choices = dnsTypeChoices();
    expect(choices).toEqual([
      { value: 'doh', label: 'DNS over HTTPS (DoH)' },
      { value: 'dot', label: 'DNS over TLS (DoT)' },
      { value: 'udp', label: 'UDP' },
    ]);
  });

  it('formats stacked validation summary messages with error details', () => {
    const err = new Error('Field X is invalid');
    const msg = formatStackedValidationMessages(err);
    expect(msg.title).toBe('Cannot save settings');
    expect(msg.instruction).toBe('Fix the highlighted fields and save again.');
    expect(msg.detail).toBe('Field X is invalid');

    const emptyMsg = formatStackedValidationMessages(null);
    expect(emptyMsg.detail).toBe('');
  });

  it('retains the required CSS class for stacked settings validation summary', () => {
    expect(STACKED_SETTINGS_VALIDATION_SUMMARY_CLASS).toContain(
      'fkp-stacked-settings-validation-summary',
    );
  });
});
