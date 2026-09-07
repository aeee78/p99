import { P99_UCI_PACKAGE, SECONDARY_RULESET_OPTIONS } from '../../../constants';
import {
  childItemOrder,
  childOwnerOption,
  compactItemSettings,
  normalizeDynamicListItems,
  uniqueDynamicListItems,
} from '../../section/childItems';
import {
  isBuiltinRulesetValue,
  secondaryRulesetId,
  secondaryRulesetUrl,
} from '../../section/rulesets';
import { stringArraysEqual } from '../../section/clientIsolation';
import { validateUrl } from '../../../validators/validateUrl';

export const RULE_SET_ITEM_SETTINGS_KEY = 'rule_set_settings';

export interface ChildItemOptions {
  typeName: string;
  valueOption?: string;
  ownerOption?: string;
  createId?: (inputValue: string, sectionId: string) => string;
  defaults?: Record<
    string,
    | unknown
    | ((inputValue: string, sectionId: string, itemId: string) => unknown)
  >;
  stagedSettings?: (
    inputValue: string,
    itemId: string,
    created: boolean,
  ) => Record<string, unknown> | null;
}

export function readItemSettingsMap(
  section_id: string,
  settingsKey: string,
): Record<string, unknown> {
  if (typeof uci === 'undefined' || typeof uci.get !== 'function') {
    return {};
  }
  const raw = uci.get(P99_UCI_PACKAGE, section_id, settingsKey);
  if (!raw) {
    return {};
  }

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function writeItemSettingsMap(
  section_id: string,
  settingsKey: string,
  map: Record<string, unknown>,
): void {
  if (typeof uci === 'undefined' || typeof uci.set !== 'function') {
    return;
  }
  const compacted = compactItemSettings(map);
  if (Object.keys(compacted).length) {
    uci.set(
      P99_UCI_PACKAGE,
      section_id,
      settingsKey,
      JSON.stringify(compacted),
    );
  } else {
    uci.unset(P99_UCI_PACKAGE, section_id, settingsKey);
  }
}

export function cleanupListItemSettings(
  section_id: string,
  settingsKey: string,
  values: unknown,
): void {
  const keep = new Set(normalizeDynamicListItems(values));
  const settings = readItemSettingsMap(section_id, settingsKey);
  let changed = false;

  Object.keys(settings).forEach((key) => {
    if (!keep.has(key)) {
      delete settings[key];
      changed = true;
    }
  });

  if (changed) {
    writeItemSettingsMap(section_id, settingsKey, settings);
  }
}

export interface UciSectionRecord {
  ['.name']?: string;
  ['.type']?: string;
  [key: string]: unknown;
}

export function getChildItemIds(
  section_id: string,
  typeName: string,
  ownerOption?: string,
): string[] {
  if (typeof uci === 'undefined' || typeof uci.sections !== 'function') {
    return [];
  }
  const ownerKey = childOwnerOption(ownerOption);
  const rawSections = uci.sections(P99_UCI_PACKAGE, typeName);
  const items: UciSectionRecord[] = Array.isArray(rawSections)
    ? (rawSections as UciSectionRecord[])
    : [];

  const filtered = items.filter((item) => item[ownerKey] === section_id);

  if (typeName === 'priority_level') {
    filtered.sort((a, b) => {
      const orderDiff = childItemOrder(a) - childItemOrder(b);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return `${a['.name'] || ''}`.localeCompare(`${b['.name'] || ''}`);
    });
  }

  return filtered.map((item) => `${item['.name'] || ''}`).filter(Boolean);
}

export function childItemValue(
  itemId: string,
  valueOption?: string,
  fallback?: string,
): string {
  if (!valueOption) {
    return itemId;
  }
  if (typeof uci === 'undefined' || typeof uci.get !== 'function') {
    return fallback || itemId;
  }
  const value = uci.get(P99_UCI_PACKAGE, itemId, valueOption);
  return value == null || value === '' ? fallback || itemId : `${value}`;
}

export function isExistingChildItem(
  section_id: string,
  itemId: string,
  typeName: string,
  ownerOption?: string,
): boolean {
  if (!itemId || typeof uci === 'undefined' || typeof uci.get !== 'function') {
    return false;
  }
  const ownerKey = childOwnerOption(ownerOption);
  return Boolean(
    uci.get(P99_UCI_PACKAGE, itemId, '.type') === typeName &&
      uci.get(P99_UCI_PACKAGE, itemId, ownerKey) === section_id,
  );
}

export function findChildItemForInput(
  section_id: string,
  options: ChildItemOptions,
  inputValue: string,
): string | null {
  const rawValue = `${inputValue || ''}`.trim();

  if (
    isExistingChildItem(
      section_id,
      rawValue,
      options.typeName,
      options.ownerOption,
    )
  ) {
    return rawValue;
  }

  if (options.valueOption) {
    const ids = getChildItemIds(
      section_id,
      options.typeName,
      options.ownerOption,
    );
    const found = ids.find(
      (itemId) =>
        childItemValue(itemId, options.valueOption, itemId) === rawValue,
    );
    return found || null;
  }

  return null;
}

export function createChildItem(
  section_id: string,
  options: ChildItemOptions,
  inputValue: string,
): { value: string; text: string; created: boolean } {
  const rawValue = `${inputValue || ''}`.trim();
  const existing = findChildItemForInput(section_id, options, rawValue);

  if (existing) {
    return {
      value: existing,
      text: options.valueOption
        ? childItemValue(existing, options.valueOption, existing)
        : existing,
      created: false,
    };
  }

  const requestedId =
    typeof options.createId === 'function'
      ? `${options.createId(rawValue, section_id) || ''}`.trim()
      : '';
  const itemId =
    (requestedId &&
      typeof uci !== 'undefined' &&
      typeof (uci as unknown as { add: (...a: unknown[]) => string }).add ===
        'function' &&
      (
        uci as unknown as {
          add: (pkg: string, type: string, id: string) => string;
        }
      ).add(P99_UCI_PACKAGE, options.typeName, requestedId)) ||
    requestedId ||
    (typeof uci !== 'undefined' &&
    typeof (uci as unknown as { add: (...a: unknown[]) => string }).add ===
      'function'
      ? (uci as unknown as { add: (pkg: string, type: string) => string }).add(
          P99_UCI_PACKAGE,
          options.typeName,
        )
      : '');

  if (typeof uci !== 'undefined' && typeof uci.set === 'function') {
    uci.set(
      P99_UCI_PACKAGE,
      itemId,
      childOwnerOption(options.ownerOption),
      section_id,
    );

    if (options.valueOption) {
      uci.set(P99_UCI_PACKAGE, itemId, options.valueOption, rawValue);
    }

    if (options.defaults && typeof options.defaults === 'object') {
      Object.entries(options.defaults).forEach(([key, val]) => {
        const resolved =
          typeof val === 'function' ? val(rawValue, section_id, itemId) : val;
        if (resolved !== undefined && resolved !== null && resolved !== '') {
          uci.set(P99_UCI_PACKAGE, itemId, key, `${resolved}`);
        }
      });
    }
  }

  return {
    value: itemId,
    text: options.valueOption ? rawValue : itemId,
    created: true,
  };
}

export function applyChildItemSettings(
  itemId: string,
  settings: Record<string, unknown>,
): void {
  if (typeof uci === 'undefined') {
    return;
  }
  Object.entries(settings || {}).forEach(([key, value]) => {
    if (!key || key.charAt(0) === '.') {
      return;
    }

    if (value === undefined || value === null || value === '') {
      uci.unset(P99_UCI_PACKAGE, itemId, key);
    } else if (Array.isArray(value)) {
      uci.set(
        P99_UCI_PACKAGE,
        itemId,
        key,
        value
          .map((item) => `${item || ''}`.trim())
          .filter((item) => item.length > 0),
      );
    } else {
      uci.set(P99_UCI_PACKAGE, itemId, key, `${value}`);
    }
  });
}

export function materializeChildItems(
  section_id: string,
  options: ChildItemOptions,
  inputValue: unknown,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  normalizeDynamicListItems(inputValue).forEach((value) => {
    const createdItem = createChildItem(section_id, options, value);
    const itemId = createdItem.value;
    const stagedSettings =
      createdItem.created && typeof options.stagedSettings === 'function'
        ? options.stagedSettings(value, itemId, createdItem.created)
        : null;

    if (stagedSettings) {
      applyChildItemSettings(itemId, stagedSettings);
    }

    if (itemId && !seen.has(itemId)) {
      seen.add(itemId);
      result.push(itemId);
    }
  });

  return result;
}

export function cleanupPriorityLevelsForGroup(groupId: string): void {
  if (typeof uci === 'undefined') {
    return;
  }
  getChildItemIds(groupId, 'priority_level', 'group').forEach((levelId) => {
    if (
      typeof (uci as unknown as { remove: (p: string, id: string) => void })
        .remove === 'function'
    ) {
      (uci as unknown as { remove: (p: string, id: string) => void }).remove(
        P99_UCI_PACKAGE,
        levelId,
      );
    }
  });
}

export function cleanupRemovedChildItems(
  section_id: string,
  typeName: string,
  keepValues: unknown,
  ownerOption?: string,
): void {
  if (typeof uci === 'undefined') {
    return;
  }
  const keep = new Set(normalizeDynamicListItems(keepValues));

  getChildItemIds(section_id, typeName, ownerOption).forEach((itemId) => {
    if (!keep.has(itemId)) {
      if (typeName === 'priority_group') {
        cleanupPriorityLevelsForGroup(itemId);
      }
      if (
        typeof (uci as unknown as { remove: (p: string, id: string) => void })
          .remove === 'function'
      ) {
        (uci as unknown as { remove: (p: string, id: string) => void }).remove(
          P99_UCI_PACKAGE,
          itemId,
        );
      }
    }
  });
}

export function parseSubscriptionUrlEntry(value?: string | null): {
  url: string;
  label: string;
  userAgent?: string;
} {
  const trimmed = `${value || ''}`.trim();
  const parts = trimmed.split(/\s+/);
  return {
    url: parts[0] || '',
    label: parts[1] || parts[0] || '',
  };
}

export function validateSubscriptionUrlEntry(
  _section_id: string,
  value: unknown,
): true | string {
  const trimmed = `${value || ''}`.trim();
  if (!trimmed) {
    return true;
  }
  const { url } = parseSubscriptionUrlEntry(trimmed);
  const validation = validateUrl(url);
  return validation.valid ? true : validation.message;
}

export function parseOutboundJsonObject(
  value: unknown,
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  try {
    const parsed = JSON.parse(`${value}`);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function outboundJsonDisplayTag(value: unknown): string {
  const obj = parseOutboundJsonObject(value);
  return `${(obj && obj.tag) || ''}`.trim();
}

export function outboundJsonListItemLabel(value: unknown): string {
  const obj = parseOutboundJsonObject(value);
  if (!obj) {
    return `${value || ''}`.trim();
  }
  const tag = `${obj.tag || ''}`.trim();
  const type = `${obj.type || ''}`.trim();
  return tag && type ? `${tag} (${type})` : tag || `${value || ''}`.trim();
}

export function normalizeOptionValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => `${item || ''}`.trim()).filter(Boolean);
  }

  const normalized = `${value || ''}`.trim();
  return normalized ? [normalized] : [];
}

export function getConfigListValues(section_id: string, key: string): string[] {
  if (typeof uci === 'undefined' || typeof uci.get !== 'function') {
    return [];
  }
  return normalizeOptionValues(uci.get(P99_UCI_PACKAGE, section_id, key));
}

export function writeListOption(
  section_id: string,
  key: string,
  values: unknown,
): void {
  if (typeof uci === 'undefined') {
    return;
  }
  const normalized = normalizeOptionValues(values);

  if (stringArraysEqual(getConfigListValues(section_id, key), normalized)) {
    return;
  }

  if (normalized.length) {
    uci.set(P99_UCI_PACKAGE, section_id, key, normalized);
  } else {
    uci.unset(P99_UCI_PACKAGE, section_id, key);
  }
}

export function itemSettingsFlag(
  settings: unknown,
  key: string,
  defaultValue: boolean,
): boolean {
  if (!settings || typeof settings !== 'object') {
    return defaultValue;
  }

  const value = (settings as Record<string, unknown>)[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return value === '1' || value === true || value === 1;
}

export function childItemInputValue(
  section_id: string,
  value: string,
  typeName: string,
  valueOption?: string,
  ownerOption?: string,
): string {
  const itemId = `${value || ''}`;

  if (isExistingChildItem(section_id, itemId, typeName, ownerOption)) {
    return childItemValue(itemId, valueOption, itemId);
  }

  return itemId;
}

export function settingValueEquals(left: unknown, right: unknown): boolean {
  const normalize = (value: unknown): string => {
    if (Array.isArray(value)) {
      return JSON.stringify(value.map((item) => `${item || ''}`));
    }

    return value === undefined || value === null ? '' : `${value}`;
  };

  return normalize(left) === normalize(right);
}

export function readChildSettings(
  itemId: string,
  keys: string[],
  defaults?: Record<string, unknown>,
): Record<string, unknown> {
  const result = Object.assign({}, defaults || {});

  if (typeof uci === 'undefined' || typeof uci.get !== 'function') {
    return result;
  }

  keys.forEach((key) => {
    const value = uci.get(P99_UCI_PACKAGE, itemId, key);
    if (value !== null && value !== undefined) {
      result[key] = Array.isArray(value) ? value.slice() : value;
    }
  });

  return result;
}

export function changedSettings(
  base: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined,
  keys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  keys.forEach((key) => {
    if (!settingValueEquals(base ? base[key] : null, next ? next[key] : null)) {
      result[key] = next ? next[key] : null;
    }
  });

  return result;
}

export function hasChangedSettings(
  settings?: Record<string, unknown> | null,
): boolean {
  return Object.keys(settings || {}).length > 0;
}

export function childPendingSettingsStore(
  option: any,
  section_id: string,
): Record<string, Record<string, unknown>> {
  if (!option.pendingChildSettings) {
    option.pendingChildSettings = {};
  }

  if (!option.pendingChildSettings[section_id]) {
    option.pendingChildSettings[section_id] = {};
  }

  return option.pendingChildSettings[section_id];
}

export function pendingChildSettings(
  option: any,
  section_id: string,
  value: string,
  defaults?: Record<string, unknown>,
): Record<string, unknown> {
  value = `${value || ''}`.trim();
  const store = childPendingSettingsStore(option, section_id);

  if (!store[value]) {
    store[value] = Object.assign({}, defaults || {});
  }

  return store[value];
}

export function getRulesetReferences(section_id: string): string[] {
  return getConfigListValues(section_id, 'rule_set');
}

export function getBuiltInRulesetReferences(section_id: string): string[] {
  const values = getConfigListValues(section_id, 'community_lists').filter(
    (value) => isBuiltinRulesetValue(value),
  );

  return values.filter(
    (value, index, allValues) =>
      isBuiltinRulesetValue(value) && allValues.indexOf(value) === index,
  );
}

export function getSecondaryRulesetReferences(section_id: string): string[] {
  const custom = getConfigListValues(section_id, 'rule_set_with_subnets')
    .map((v) => secondaryRulesetId(v))
    .filter(Boolean);
  return Array.from(new Set(custom));
}

export function getCustomRulesetReferences(section_id: string): string[] {
  return uniqueDynamicListItems([
    ...getRulesetReferences(section_id).filter(
      (value) => !isBuiltinRulesetValue(value),
    ),
    ...getConfigListValues(section_id, 'rule_set_with_subnets').filter(
      (value) => !secondaryRulesetId(value),
    ),
  ]);
}

export function writeBuiltInRulesetReferences(
  section_id: string,
  values: unknown,
): void {
  const refs = normalizeDynamicListItems(values).filter((value) =>
    isBuiltinRulesetValue(value),
  );
  writeListOption(section_id, 'community_lists', refs);
}

export function writeSecondaryRulesetReferences(
  section_id: string,
  values: unknown,
): void {
  const custom = getConfigListValues(
    section_id,
    'rule_set_with_subnets',
  ).filter((value) => !secondaryRulesetId(value));
  const builtins = normalizeDynamicListItems(values)
    .filter((value) =>
      Object.prototype.hasOwnProperty.call(
        SECONDARY_RULESET_OPTIONS || {},
        value,
      ),
    )
    .map((v) => secondaryRulesetUrl(v));
  writeListOption(section_id, 'rule_set_with_subnets', [
    ...custom,
    ...builtins,
  ]);
}

export function writeCustomRulesetReferences(
  section_id: string,
  values: unknown,
): void {
  const refs = uniqueDynamicListItems(values);
  const action =
    typeof uci !== 'undefined' && typeof uci.get === 'function'
      ? (uci.get(P99_UCI_PACKAGE, section_id, 'action') as string)
      : '';
  if (action === 'dns') {
    writeDnsRulesetReferences(section_id, refs);
    return;
  }
  const secondaryRefs = getConfigListValues(
    section_id,
    'rule_set_with_subnets',
  ).filter((value) => secondaryRulesetId(value));
  const subnetRefs = getConfigListValues(
    section_id,
    'rule_set_with_subnets',
  ).filter((value) => !secondaryRulesetId(value) && refs.includes(value));
  const subnetRefSet = new Set(subnetRefs);

  writeListOption(
    section_id,
    'rule_set',
    refs.filter((value) => !subnetRefSet.has(value)),
  );
  writeListOption(section_id, 'rule_set_with_subnets', [
    ...secondaryRefs,
    ...subnetRefs,
  ]);
  uci.unset(P99_UCI_PACKAGE, section_id, RULE_SET_ITEM_SETTINGS_KEY);
}

export function writeDnsRulesetReferences(
  section_id: string,
  values: unknown,
): void {
  writeListOption(section_id, 'rule_set', uniqueDynamicListItems(values));
  uci.unset(P99_UCI_PACKAGE, section_id, 'rule_set_with_subnets');
  uci.unset(P99_UCI_PACKAGE, section_id, RULE_SET_ITEM_SETTINGS_KEY);
}
