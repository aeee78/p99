import { createSettingsContent } from './settings';
import type { LuciSection, UiCapabilities } from './types';

export * from './types';
export * from './downloadSection';
export * from './dnsSettings';
export * from './latencySettings';
export * from './settings';

export const SettingsTab = {
  createSettingsContent(
    section: LuciSection,
    capabilities?: UiCapabilities,
  ): void {
    createSettingsContent(section, capabilities);
  },
};
