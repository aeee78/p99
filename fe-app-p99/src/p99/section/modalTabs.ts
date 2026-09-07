export interface ModalTabDefinition {
  id: string;
  label: string;
  description?: string;
}

export const MODAL_TAB_IDS = {
  SETTINGS: 'settings',
  CONDITIONS: 'conditions',
  CLIENTS: 'clients',
  ADVANCED: 'advanced',
} as const;

function translate(key: string): string {
  if (typeof _ === 'function') {
    return _(key);
  }
  return key;
}

export function getModalTabs(): ModalTabDefinition[] {
  return [
    { id: MODAL_TAB_IDS.SETTINGS, label: translate('General') },
    { id: MODAL_TAB_IDS.CONDITIONS, label: translate('Rules & Traffic') },
    { id: MODAL_TAB_IDS.CLIENTS, label: translate('Clients & Devices') },
    { id: MODAL_TAB_IDS.ADVANCED, label: translate('Advanced') },
  ];
}

export interface DnsTypeChoice {
  value: string;
  label: string;
}

export function dnsTypeChoices(): DnsTypeChoice[] {
  return [
    { value: 'doh', label: translate('DNS over HTTPS (DoH)') },
    { value: 'dot', label: translate('DNS over TLS (DoT)') },
    { value: 'udp', label: 'UDP' },
  ];
}

export const STACKED_SETTINGS_VALIDATION_SUMMARY_CLASS =
  'alert-message warning fkp-stacked-settings-validation-summary';

export function formatStackedValidationMessages(
  error?: Error | { message?: string } | null,
): {
  title: string;
  instruction: string;
  detail: string;
} {
  return {
    title: translate('Cannot save settings'),
    instruction: translate('Fix the highlighted fields and save again.'),
    detail: error?.message || '',
  };
}
