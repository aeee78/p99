import { isSingBoxDuration } from '../../section/duration';
import { validateDNS } from '../../../validators/validateDns';
import type { LuciOption } from './types';

export function optionListValues(
  option: LuciOption,
  section_id: string,
): string[] {
  const formValue = option.formvalue?.(section_id);
  const value = formValue != null ? formValue : option.cfgvalue?.(section_id);
  const arrayValue =
    typeof L !== 'undefined' && typeof L.toArray === 'function'
      ? L.toArray(value)
      : Array.isArray(value)
        ? value
        : value != null
          ? [value]
          : [];

  return arrayValue.map((item) => `${item ?? ''}`.trim()).filter(Boolean);
}

export function configureDnsList(
  option: LuciOption,
  choices: Record<string, string>,
  defaultValue: string,
): void {
  Object.entries(choices).forEach(([key, label]) => {
    option.value(key, _(label));
  });
  option.default = [defaultValue];
  option.rmempty = false;
  option.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const normalized = `${value ?? ''}`.trim();
    if (!normalized) {
      return optionListValues(option, _section_id).length > 0
        ? true
        : _('Add at least one DNS server');
    }
    const validation = validateDNS(normalized);
    return validation.valid
      ? true
      : validation.message || 'Invalid DNS address';
  };
}

export function configureDnsFailoverVisibility(
  option: LuciOption,
  dnsOption: LuciOption,
  bootstrapOption: LuciOption,
): void {
  option.depends('dns_server', '__p99_multiple_dns__');
  option.depends('bootstrap_dns_server', '__p99_multiple_dns__');
  option.retain = true;
  option.checkDepends = function (section_id: string): boolean {
    return (
      optionListValues(dnsOption, section_id).length > 1 ||
      optionListValues(bootstrapOption, section_id).length > 1
    );
  };
}

export function configureDnsDuration(
  option: LuciOption,
  defaultValue: string,
  dnsOption: LuciOption,
  bootstrapOption: LuciOption,
): void {
  option.default = defaultValue;
  option.rmempty = false;
  option.validate = function (
    _section_id: string,
    value: unknown,
  ): boolean | string {
    const normalized = `${value ?? ''}`.trim();
    if (!normalized || !isSingBoxDuration(normalized)) {
      return _('Use sing-box duration format like 10s, 1m or 2m30s');
    }
    return true;
  };
  configureDnsFailoverVisibility(option, dnsOption, bootstrapOption);
}
