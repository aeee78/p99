import { P99_UCI_PACKAGE } from '../../../constants';
import type { LuciOption, UiCapabilities } from './types';

export function isDownloadSectionAction(
  action?: string,
  capabilities?: UiCapabilities,
): boolean {
  switch (action) {
    case 'connection':
    case 'proxy':
    case 'outbound':
    case 'vpn':
      return true;
    case 'zapret':
      return !capabilities?.loaded || Boolean(capabilities.zapretInstalled);
    case 'zapret2':
      return !capabilities?.loaded || Boolean(capabilities.zapret2Installed);
    case 'byedpi':
      return !capabilities?.loaded || Boolean(capabilities.byedpiInstalled);
    default:
      return false;
  }
}

export function refreshDownloadSectionChoices(
  option: LuciOption,
  capabilities?: UiCapabilities,
): void {
  const sections = option.map?.data?.state?.values?.[P99_UCI_PACKAGE] ?? {};

  option.keylist = [];
  option.vallist = [];

  for (const secName in sections) {
    const sec = sections[secName];
    if (
      sec &&
      typeof sec === 'object' &&
      sec['.type'] === 'section' &&
      sec.enabled !== '0' &&
      isDownloadSectionAction(sec.action as string | undefined, capabilities)
    ) {
      const label = (sec.label as string) || secName;
      option.value(secName, label);
    }
  }
}

export function configureDownloadSectionOption(
  option: LuciOption,
  sectionOption: string,
  capabilities?: UiCapabilities,
): void {
  option.default = '';
  option.rmempty = false;
  option.cfgvalue = function (section_id: string): string {
    return (
      (uci.get(P99_UCI_PACKAGE, section_id, sectionOption) as string) || ''
    );
  };
  option.load = function (this: LuciOption, section_id: string): unknown {
    refreshDownloadSectionChoices(this, capabilities);
    return this.cfgvalue?.(section_id);
  };
  option.write = function (section_id: string, value: unknown): void {
    const normalized = value ? `${value}`.trim() : '';

    if (normalized) {
      uci.set(P99_UCI_PACKAGE, section_id, sectionOption, normalized);
    } else {
      uci.unset(P99_UCI_PACKAGE, section_id, sectionOption);
    }
  };
  option.remove = function (section_id: string): void {
    uci.unset(P99_UCI_PACKAGE, section_id, sectionOption);
  };
  option.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    return value ? true : _('Select a section');
  };
}

export function configureDownloadViaProxyFlag(
  option: LuciOption,
  sectionOption: string,
): void {
  option.default = '0';
  option.rmempty = false;
  option.write = function (
    this: LuciOption,
    section_id: string,
    value: unknown,
  ): void {
    const enabled = value === '1' || value === true;
    if (this.option) {
      uci.set(P99_UCI_PACKAGE, section_id, this.option, enabled ? '1' : '0');
    }
    if (!enabled) {
      uci.unset(P99_UCI_PACKAGE, section_id, sectionOption);
    }
  };
}
