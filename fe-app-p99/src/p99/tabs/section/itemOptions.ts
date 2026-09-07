import {
  DEFAULT_LATENCY_TEST_URL,
  LATENCY_TEST_URL_OPTIONS,
  P99_UCI_PACKAGE,
} from '../../../constants';
import { getProxyUrlName } from '../../../helpers/getProxyUrlName';
import { normalizeDynamicListItems } from '../../section/childItems';
import {
  countryChoices as geoCountryChoices,
  COUNTRY_CODES,
  getCountryOptionLabel,
  validateCountryCode,
} from '../../section/geo';
import { getUciSectionLabel, getUciSectionName } from '../../section/detours';
import { dnsTypeChoices as sectionDnsTypeChoices } from '../../section/modalTabs';
import {
  validateOptionalSingBoxDuration,
  validateRequiredSingBoxDuration,
} from '../../section/duration';
import { validateOutboundJson } from '../../../validators/validateOutboundJson';
import { validateUrl } from '../../../validators/validateUrl';
import {
  childItemInputValue,
  childPendingSettingsStore,
  cleanupListItemSettings,
  cleanupRemovedChildItems,
  getConfigListValues,
  getChildItemIds,
  isExistingChildItem,
  materializeChildItems,
  normalizeOptionValues,
  outboundJsonDisplayTag,
  readChildSettings,
  settingValueEquals,
} from './childItemsManager';
import {
  isByedpiInstalledForUi,
  isZapret2InstalledForUi,
  isZapretInstalledForUi,
} from './availability';
import { showPriorityLevelSettingsModal } from './settingsModals';

export const CONNECTIONS_BLOCKED_INTERFACES = [
  'br-lan',
  'eth0',
  'eth1',
  'wan',
  'phy0-ap0',
  'phy1-ap0',
  'pppoe-wan',
  'lan',
];

export const CONNECTIONS_DYNLIST_STYLE_ID = 'fkp-connections-dynlist-styles';
const SECTION_CACHE_DIR = '/var/run/p99/section-cache';

export function plainObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

export function safeCacheSectionName(section_id: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(`${section_id || ''}`);
}

export function filteredOutboundMetadataFromCache(cache: any): {
  names: Record<string, string>;
  countries: Record<string, string>;
} {
  const metadata = plainObject(plainObject(cache).outboundMetadata);
  const names = plainObject(metadata.names);
  const countries = plainObject(metadata.countries);
  const candidateTags = Array.isArray(cache.urltestCandidateTags)
    ? cache.urltestCandidateTags
    : [];
  const groups = plainObject(cache.urltestGroups);
  const result = {
    names: {} as Record<string, string>,
    countries: {} as Record<string, string>,
  };

  if (candidateTags.length > 0) {
    candidateTags.forEach((tag: string) => {
      tag = `${tag || ''}`;
      if (!tag) {
        return;
      }
      if (names[tag] != null) {
        result.names[tag] = names[tag];
      }
      if (countries[tag] != null) {
        result.countries[tag] = countries[tag];
      }
    });
    return result;
  }

  Object.entries(names).forEach(([tag, name]) => {
    if (!groups[tag]) {
      result.names[tag] = name as string;
    }
  });
  Object.entries(countries).forEach(([tag, country]) => {
    if (!groups[tag]) {
      result.countries[tag] = country as string;
    }
  });

  return result;
}

export function readOutboundMetadataFromSectionCache(
  section_id: string,
): Promise<{
  names: Record<string, string>;
  countries: Record<string, string>;
}> {
  if (!safeCacheSectionName(section_id)) {
    return Promise.resolve({ names: {}, countries: {} });
  }

  return fs
    .read(`${SECTION_CACHE_DIR}/${section_id}.json`)
    .then((raw: string) =>
      filteredOutboundMetadataFromCache(JSON.parse(raw || '{}')),
    )
    .catch(() => ({ names: {}, countries: {} }));
}

export const outboundNameChoicesCache = new Map<string, string[]>();
export const outboundNameChoicesInflight = new Map<string, Promise<string[]>>();
export const outboundNameSourceOptions = new Map<string, any>();
export const sectionGroupSourceOptions = new Map<string, any>();
export const dashboardFilterChoiceRefreshers = new Map<
  string,
  Set<() => boolean | void>
>();

export function loadOutboundNameChoices(section_id: string): Promise<string[]> {
  if (outboundNameChoicesCache.has(section_id)) {
    return Promise.resolve(outboundNameChoicesCache.get(section_id)!);
  }

  if (outboundNameChoicesInflight.has(section_id)) {
    return outboundNameChoicesInflight.get(section_id)!;
  }

  const task = readOutboundMetadataFromSectionCache(section_id)
    .then((metadata) => {
      const names = Object.values(plainObject(metadata.names)) as string[];

      const choices = names
        .filter(Boolean)
        .filter((name, index, values) => values.indexOf(name) === index)
        .sort((a, b) => `${a}`.localeCompare(`${b}`));

      outboundNameChoicesCache.set(section_id, choices);

      return choices;
    })
    .catch(() => [])
    .finally(() => {
      outboundNameChoicesInflight.delete(section_id);
    });

  outboundNameChoicesInflight.set(section_id, task);

  return task;
}

export function ensureConnectionsDynamicListStyles(): void {
  if (
    typeof document === 'undefined' ||
    document.getElementById(CONNECTIONS_DYNLIST_STYLE_ID)
  ) {
    return;
  }

  document.head.appendChild(
    E(
      'style',
      { id: CONNECTIONS_DYNLIST_STYLE_ID },
      `
.fkp-connections-dynlist > .item {
  --fkp-dynlist-action-width: 2em;
  padding-right: calc(var(--fkp-dynlist-action-width) * 2);
  position: relative;
}

.fkp-connections-dynlist > .item > .fkp-dynlist-settings {
  align-items: center;
  border: 1px solid var(--border-color-high, currentColor);
  border-right: 0;
  border-radius: 0;
  bottom: -1px;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 0.9em;
  justify-content: center;
  line-height: 1;
  min-height: 0;
  min-width: var(--fkp-dynlist-action-width);
  padding: 0;
  pointer-events: auto;
  position: absolute;
  right: calc(var(--fkp-dynlist-action-width) - 1px);
  user-select: none;
  text-decoration: none;
  top: -1px;
  width: var(--fkp-dynlist-action-width);
  z-index: 1;
}

.fkp-connections-dynlist > .item > .fkp-dynlist-settings:hover,
.fkp-connections-dynlist > .item > .fkp-dynlist-settings:focus {
  --focus-color-rgb: 82, 168, 236;
  outline: 0;
  border-color: rgba(var(--focus-color-rgb), 0.8) !important;
  box-shadow: inset 0 1px 3px hsla(var(--border-color-low-hsl), .01), 0 0 8px rgba(var(--focus-color-rgb), 0.6);
  text-decoration: none;
}

.fkp-connections-dynlist > .add-item > .cbi-dropdown {
  width: 100%;
}

.fkp-interface-dynlist-label {
  align-items: center;
  display: inline-flex;
  gap: 0.25em;
  max-width: 100%;
  vertical-align: middle;
}

.fkp-interface-dynlist-label > img {
  flex: 0 0 auto;
  height: 1.35em;
  width: auto;
}

.fkp-interface-dynlist-label > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fkp-button-add-dynlist > .add-item {
  align-items: stretch;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: flex;
  margin-top: 4px;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
  padding: 0;
  width: var(--fkp-button-add-width, 210px);
}

.fkp-button-add-dynlist > .add-item > input[type="text"] {
  display: none !important;
}

.fkp-button-add-dynlist > .add-item > .cbi-button-add {
  align-items: center !important;
  background: linear-gradient(var(--background-color-high, var(--primary, ButtonFace)) 0%, var(--border-color-low, var(--primary, ButtonFace)) 100%) !important;
  border: 1px solid var(--border-color-high, var(--primary, currentColor)) !important;
  border-radius: 3px !important;
  box-shadow: inset 0 1px 3px hsla(var(--border-color-low-hsl, 0, 0%, 0%), .01) !important;
  box-sizing: border-box !important;
  color: var(--text-color-medium, var(--white, ButtonText)) !important;
  cursor: pointer !important;
  display: flex !important;
  font-size: 13px !important;
  height: 30px !important;
  justify-content: flex-start !important;
  margin-left: 0 !important;
  max-height: 30px !important;
  min-height: 30px !important;
  max-width: 100% !important;
  overflow: hidden !important;
  padding: 0 4px !important;
  text-overflow: ellipsis !important;
  transition: border linear .2s, box-shadow linear .2s !important;
  white-space: nowrap !important;
  width: 100% !important;
}

.fkp-button-add-dynlist > .add-item > .cbi-button-add:hover,
.fkp-button-add-dynlist > .add-item > .cbi-button-add:focus {
  outline: 0;
  border-color: rgba(82, 168, 236, 0.8) !important;
  box-shadow: inset 0 1px 3px hsla(var(--border-color-low-hsl, 0, 0%, 0%), .01), 0 0 8px rgba(82, 168, 236, 0.6) !important;
}
`,
    ),
  );
}

export function findDynamicListItemByValue(
  dl: HTMLElement | null,
  value: string,
): HTMLElement | null {
  if (!dl || !dl.querySelectorAll) {
    return null;
  }

  const items = dl.querySelectorAll('.item');
  for (let i = 0; i < items.length; i += 1) {
    const hidden = items[i].querySelector(
      'input[type="hidden"]',
    ) as HTMLInputElement | null;
    if (hidden && hidden.value === value) {
      return items[i] as HTMLElement;
    }
  }

  return null;
}

export function dynamicListItemCurrentValue(
  item: HTMLElement | null,
  fallback: string,
): string {
  const hidden = item
    ? (item.querySelector('input[type="hidden"]') as HTMLInputElement | null)
    : null;
  return hidden && hidden.value !== undefined ? hidden.value : fallback;
}

export function dynamicListItemValues(dl: HTMLElement | null): string[] {
  if (!dl || !dl.querySelectorAll) {
    return [];
  }

  return Array.from(dl.querySelectorAll('.item > input[type="hidden"]'))
    .map((input) => `${(input as HTMLInputElement).value || ''}`.trim())
    .filter(Boolean);
}

export function updateDynamicListItemLabel(
  item: HTMLElement,
  label: string,
): void {
  const target =
    item.querySelector('.fkp-dynlist-label') ||
    item.querySelector('span:not(.fkp-dynlist-settings)') ||
    item.firstChild;
  if (target) {
    target.textContent = label;
  }
}

export function addDynamicListItem(
  widget: any,
  value: string,
  text?: string,
): void {
  const rendered = widget && widget.node ? widget.node : widget;
  if (!widget || !rendered || typeof widget.addItem !== 'function') {
    return;
  }

  const normalizedValue = `${value || ''}`.trim();
  if (!normalizedValue) {
    return;
  }

  const label =
    text != null && `${text}`.trim() ? `${text}`.trim() : normalizedValue;
  widget.addItem(rendered, normalizedValue, label);
  if (typeof widget.dispatchCbiDynlistChange === 'function') {
    widget.dispatchCbiDynlistChange(rendered, normalizedValue);
  }
}

export function updateButtonAddDynamicListLayout(
  dl: HTMLElement | null,
  label?: string,
): void {
  if (!dl) {
    return;
  }

  const addButton = dl.querySelector('.add-item > .cbi-button-add');
  if (addButton) {
    addButton.textContent = label || _('+ Add');
  }
}

export function setDynamicListItemValue(
  item: HTMLElement | null,
  value: string,
): void {
  const hidden = item
    ? (item.querySelector('input[type="hidden"]') as HTMLInputElement | null)
    : null;
  if (hidden) {
    hidden.value = value;
  }
}

export const SettingsUIDynamicList: any = (ui.DynamicList as any).extend({
  render() {
    ensureConnectionsDynamicListStyles();

    const node = (ui.DynamicList as any).prototype.render.apply(
      this,
      arguments,
    );
    node.classList.add('fkp-connections-dynlist');
    return node;
  },

  addItem(dl: HTMLElement, value: string, text: string, flash: boolean) {
    if (
      flash &&
      typeof this.options.hasEquivalentValue === 'function' &&
      this.options.hasEquivalentValue(value, dl)
    ) {
      this.dispatchCbiDynlistChange(dl, value);
      return;
    }

    const itemText =
      typeof this.options.itemLabel === 'function'
        ? this.options.itemLabel(value, text)
        : text;

    (ui.DynamicList as any).prototype.addItem.call(
      this,
      dl,
      value,
      itemText,
      flash,
    );

    const item = findDynamicListItemByValue(dl, value);
    const hasSettings =
      typeof this.options.hasSettings === 'function'
        ? this.options.hasSettings(value)
        : true;

    if (!item || item.querySelector('.fkp-dynlist-settings') || !hasSettings) {
      return;
    }

    item.appendChild(
      E(
        'span',
        {
          role: 'button',
          tabIndex: this.options.disabled ? undefined : 0,
          class: 'fkp-dynlist-settings',
          'aria-label': _('Settings'),
          'aria-disabled': this.options.disabled ? 'true' : undefined,
          click: (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            if (this.options.disabled) {
              return;
            }

            if (typeof this.options.settingsHandler === 'function') {
              this.options.settingsHandler(
                dynamicListItemCurrentValue(item, value),
                item,
                this,
                {},
              );
            }
          },
        },
        '\u2699',
      ),
    );
  },
  handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target && target.closest('.fkp-dynlist-settings')) {
      return;
    }

    return (ui.DynamicList as any).prototype.handleClick.apply(this, arguments);
  },
});

export const ButtonAddSettingsUIDynamicList: any = SettingsUIDynamicList.extend(
  {
    render() {
      const node = SettingsUIDynamicList.prototype.render.apply(
        this,
        arguments,
      );
      node.classList.add('fkp-button-add-dynlist');

      const input = node.querySelector('.add-item > input[type="text"]');
      if (input) {
        input.setAttribute('aria-hidden', 'true');
        input.setAttribute('tabindex', '-1');
      }

      updateButtonAddDynamicListLayout(node, this.options.addButtonLabel);

      node.addEventListener('cbi-dynlist-change', () => {
        updateButtonAddDynamicListLayout(node, this.options.addButtonLabel);
      });

      return node;
    },

    addButtonItem() {
      if (typeof this.options.settingsHandler === 'function') {
        this.options.settingsHandler('', null, this, { adding: true });
      }
    },

    handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (
        !this.options.disabled &&
        target &&
        target.closest('.add-item > .cbi-button-add')
      ) {
        event.preventDefault();
        event.stopPropagation();
        this.addButtonItem(event.currentTarget);
        return;
      }

      return SettingsUIDynamicList.prototype.handleClick.apply(this, arguments);
    },

    handleKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        !this.options.disabled &&
        target &&
        target.closest('.add-item > .cbi-button-add') &&
        (event.key === 'Enter' || event.key === ' ')
      ) {
        event.preventDefault();
        event.stopPropagation();
        this.addButtonItem(event.currentTarget);
        return;
      }

      return (ui.DynamicList as any).prototype.handleKeydown.apply(
        this,
        arguments,
      );
    },
  },
);

export const SettingsDynamicList: any = (form.DynamicList as any).extend({
  childOwner(section_id: string) {
    return typeof this.childOwnerId === 'function'
      ? `${this.childOwnerId(section_id) || ''}`.trim()
      : section_id;
  },

  parentSection(section_id: string) {
    return typeof this.parentSectionId === 'function'
      ? `${this.parentSectionId(section_id) || ''}`.trim()
      : section_id;
  },

  load(section_id: string) {
    if (this.childType) {
      return getChildItemIds(
        this.childOwner(section_id),
        this.childType,
        this.ownerOption,
      );
    }

    return (form.DynamicList as any).prototype.load.apply(this, arguments);
  },

  renderWidget(section_id: string, _option_index: number, cfgvalue: unknown) {
    const value = cfgvalue != null ? cfgvalue : this.default;
    const choices = this.transformChoices();
    const WidgetClass = this.buttonAdd
      ? ButtonAddSettingsUIDynamicList
      : SettingsUIDynamicList;
    const widget = new WidgetClass(L.toArray(value), choices, {
      id: this.cbid(section_id),
      sort: this.keylist,
      allowduplicates: this.allowduplicates,
      optional: this.optional || this.rmempty,
      datatype: this.datatype,
      placeholder: this.placeholder,
      validate: L.bind(this.validate, this, section_id),
      disabled: this.readonly != null ? this.readonly : this.map.readonly,
      addButtonLabel:
        typeof this.addButtonLabel === 'function'
          ? this.addButtonLabel(section_id)
          : this.addButtonLabel,
      settingsHandler: (
        itemValue: string,
        _item: HTMLElement,
        _widget: any,
        context: any,
      ) => {
        if (typeof this.renderItemSettingsModal === 'function') {
          const ownerId = this.childOwner(section_id);
          this.renderItemSettingsModal(
            ownerId,
            `${itemValue}`,
            this,
            _widget,
            _item,
            Object.assign({}, context || {}, {
              parentSectionId: this.parentSection(section_id),
              ownerId,
            }),
          );
        }
      },
      itemLabel: (itemValue: string, text: string) => {
        if (typeof this.renderListItemLabel === 'function') {
          return this.renderListItemLabel(
            this.childOwner(section_id),
            `${itemValue}`,
            text,
          );
        }

        return text;
      },
      hasSettings: (itemValue: string) => {
        if (typeof this.hasItemSettings === 'function') {
          return this.hasItemSettings(
            this.childOwner(section_id),
            `${itemValue}`,
          );
        }

        if (this.childType) {
          return isExistingChildItem(
            this.childOwner(section_id),
            `${itemValue}`,
            this.childType,
            this.ownerOption,
          );
        }

        return true;
      },
      hasEquivalentValue: (itemValue: string, dl: HTMLElement) => {
        const inputValueForItem = (val: string) => {
          const ownerId = this.childOwner(section_id);

          if (typeof this.inputValueForItem === 'function') {
            return `${this.inputValueForItem(ownerId, `${val || ''}`) || ''}`.trim();
          }

          if (this.childType && this.childValueOption) {
            return childItemInputValue(
              ownerId,
              `${val || ''}`,
              this.childType,
              this.childValueOption,
              this.ownerOption,
            );
          }

          return `${val || ''}`.trim();
        };
        const normalized = inputValueForItem(itemValue);

        return Boolean(
          normalized &&
            dynamicListItemValues(dl).some(
              (existingValue) =>
                inputValueForItem(existingValue) === normalized,
            ),
        );
      },
    });

    const node = widget.render();
    if (typeof this.onListChange === 'function') {
      node.addEventListener('cbi-dynlist-change', () => {
        this.onListChange(section_id);
      });
    }

    return node;
  },

  parse(section_id: string) {
    if (
      this.isActive(section_id) &&
      typeof this.validateItemsOnSave === 'function'
    ) {
      const result = this.validateItemsOnSave(
        this.childType ? this.childOwner(section_id) : section_id,
        this.formvalue(section_id),
        this,
        section_id,
      );
      if (result !== true) {
        const title = this.stripTags(this.title).trim();
        return Promise.reject(
          new TypeError(
            `${_('Option "%s" contains an invalid input value.').replace('%s', title || this.option)} ${result}`,
          ),
        );
      }
    }

    return (form.DynamicList as any).prototype.parse.apply(this, arguments);
  },

  write(section_id: string, value: unknown) {
    if (this.childType) {
      const ownerId = this.childOwner(section_id);
      const itemIds = materializeChildItems(
        ownerId,
        {
          typeName: this.childType,
          valueOption: this.childValueOption,
          ownerOption: this.ownerOption,
          createId: this.createId,
          defaults: this.childDefaults,
          stagedSettings:
            typeof this.stagedChildSettings === 'function'
              ? (itemValue, itemId, created) =>
                  this.stagedChildSettings(ownerId, itemValue, itemId, created)
              : undefined,
        },
        value,
      );
      cleanupRemovedChildItems(
        ownerId,
        this.childType,
        itemIds,
        this.ownerOption,
      );
      if (typeof this.afterMaterializeChildItems === 'function') {
        this.afterMaterializeChildItems(ownerId, itemIds);
      }
      uci.unset(P99_UCI_PACKAGE, section_id, this.option);
      cleanupListItemSettings(ownerId, this.settingsKey, itemIds);
      if (typeof this.clearStagedChildSettings === 'function') {
        this.clearStagedChildSettings(ownerId);
      }
      return;
    }

    const result = (form.DynamicList as any).prototype.write.apply(
      this,
      arguments,
    );
    cleanupListItemSettings(section_id, this.settingsKey, value);
    return result;
  },

  remove(section_id: string) {
    if (this.childType) {
      cleanupRemovedChildItems(
        this.childOwner(section_id),
        this.childType,
        [],
        this.ownerOption,
      );
      uci.unset(P99_UCI_PACKAGE, section_id, this.option);
      return;
    }

    if (this.settingsKey) {
      uci.unset(P99_UCI_PACKAGE, section_id, this.settingsKey);
    }

    return (form.DynamicList as any).prototype.remove.apply(this, arguments);
  },
});

export const ButtonAddSettingsDynamicList: any = SettingsDynamicList.extend({
  buttonAdd: true,
});

export function refreshOptionChoices(
  option: any,
  choices: Array<{ value: string; label?: string } | string>,
): void {
  delete option.keylist;
  delete option.vallist;

  (choices || []).forEach((choice) => {
    if (typeof choice === 'object') {
      option.value(choice.value, choice.label);
    } else {
      option.value(choice);
    }
  });
}

export function configureLiveDynamicListChoices(
  option: any,
  getChoices: (
    section_id: string,
    values?: any,
  ) => Array<{ value: string; label: string }>,
): void {
  option.renderWidget = function (
    section_id: string,
    _option_index: number,
    cfgvalue: unknown,
  ) {
    const values = L.toArray(cfgvalue != null ? cfgvalue : this.default);
    const choices = getChoices(section_id, values);
    const labels: Record<string, string> = {};
    choices.forEach((choice) => {
      labels[choice.value] = choice.label;
    });
    refreshOptionChoices(this, choices);
    let choiceSignature = JSON.stringify(
      choices.map((choice) => [choice.value, choice.label]),
    );

    const widget = new (ui.DynamicList as any)(values, labels, {
      id: this.cbid(section_id),
      sort: this.keylist,
      allowduplicates: this.allowduplicates,
      optional: this.optional || this.rmempty,
      datatype: this.datatype,
      placeholder: this.placeholder,
      validate: L.bind(this.validate, this, section_id),
      disabled: this.readonly != null ? this.readonly : this.map.readonly,
    });
    const node = widget.render();
    const refreshChoices = () => {
      if (!node.isConnected) {
        return false;
      }

      const currentValues = widget.getValue();
      const currentChoices = getChoices(section_id, currentValues);
      const currentLabels: Record<string, string> = {};
      currentChoices.forEach((choice) => {
        currentLabels[choice.value] = choice.label;
      });
      const currentSignature = JSON.stringify(
        currentChoices.map((choice) => [choice.value, choice.label]),
      );

      if (currentSignature === choiceSignature) {
        return;
      }
      choiceSignature = currentSignature;

      refreshOptionChoices(this, currentChoices);
      widget.choices = currentLabels;
      widget.clearChoices();
      widget.addChoices(
        currentChoices.map((choice) => choice.value),
        currentLabels,
      );
      return true;
    };
    const refreshBeforeOpening = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest('.add-item')) {
        refreshChoices();
      }
    };
    node.addEventListener('mousedown', refreshBeforeOpening, true);
    node.addEventListener('focusin', refreshBeforeOpening, true);

    if (!dashboardFilterChoiceRefreshers.has(section_id)) {
      dashboardFilterChoiceRefreshers.set(section_id, new Set());
    }
    dashboardFilterChoiceRefreshers.get(section_id)!.add(refreshChoices);

    return node;
  };
}

export function countryChoices(): Array<{ value: string; label: string }> {
  return typeof geoCountryChoices === 'function'
    ? geoCountryChoices()
    : COUNTRY_CODES.map((code) => ({
        value: code,
        label: getCountryOptionLabel(code),
      })).sort((a, b) => a.label.localeCompare(b.label));
}

export function currentOutboundNameChoices(
  section_id: string,
  values?: unknown,
): Array<{ value: string; label: string }> {
  if (!outboundNameChoicesCache.has(section_id)) {
    loadOutboundNameChoices(section_id);
  }

  const seen = new Set<string>();
  const result: Array<{ value: string; label: string }> = [];
  const append = (name: unknown) => {
    const value = `${name || ''}`.trim();
    if (!value || seen.has(value)) {
      return;
    }

    seen.add(value);
    result.push({ value, label: value });
  };

  (outboundNameChoicesCache.get(section_id) || []).forEach(append);
  currentDraftOutboundNames(section_id).forEach(append);
  normalizeDynamicListItems(values).forEach(append);

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function currentSourceOptionValues(
  section_id: string,
  optionName: string,
): string[] {
  const liveValues = currentLiveDynamicListValues(section_id, optionName);
  if (liveValues != null) {
    return liveValues;
  }

  const option = outboundNameSourceOptions.get(optionName);

  if (option && typeof option.formvalue === 'function') {
    try {
      const value = option.formvalue(section_id);
      if (value != null) {
        return normalizeDynamicListItems(value);
      }
    } catch (_error) {
      // Fall back to UCI when widget not mounted
    }
  }

  return getConfigListValues(section_id, optionName) as string[];
}

export function currentLiveDynamicListValues(
  section_id: string,
  optionName: string,
): string[] | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const widget = document.getElementById(
    `cbid.${P99_UCI_PACKAGE}.${section_id}.${optionName}`,
  );
  if (!widget) {
    return null;
  }

  const values = Array.from(
    widget.querySelectorAll('.item > input[type="hidden"]'),
  )
    .map((input) => `${(input as HTMLInputElement).value || ''}`.trim())
    .filter(Boolean);
  const pendingInput = widget.querySelector(
    '.add-item > input[type="text"]',
  ) as HTMLInputElement | null;
  const pendingValue = `${(pendingInput && pendingInput.value) || ''}`.trim();

  if (
    pendingValue &&
    pendingInput &&
    !pendingInput.classList.contains('cbi-input-invalid') &&
    !values.includes(pendingValue)
  ) {
    values.push(pendingValue);
  }

  return values;
}

export function currentDraftOutboundNames(section_id: string): string[] {
  const names: string[] = [];

  currentSourceOptionValues(section_id, 'selector_proxy_links').forEach(
    (value, index) => {
      const name = getProxyUrlName(`${value || ''}`);
      names.push(name || `${section_id}-${index + 1}-out`);
    },
  );
  currentSourceOptionValues(section_id, 'interfaces').forEach((itemId) => {
    const normalized = childItemInputValue(
      section_id,
      itemId,
      'section_interface',
      'name',
    ).trim();
    if (normalized) {
      names.push(normalized);
    }
  });
  currentSourceOptionValues(section_id, 'outbound_jsons').forEach((value) => {
    const tag = outboundJsonDisplayTag(value);
    if (tag) {
      names.push(tag);
    }
  });

  return names;
}

export function currentSectionGroupValues(
  section_id: string,
  typeName: string,
): string[] {
  const liveValues = currentLiveDynamicListValues(section_id, typeName);
  if (liveValues != null) {
    return liveValues;
  }

  const option = sectionGroupSourceOptions.get(typeName);
  if (option && typeof option.formvalue === 'function') {
    try {
      const value = option.formvalue(section_id);
      if (value != null) {
        return normalizeDynamicListItems(value);
      }
    } catch (_error) {
      // fallback
    }
  }

  return getChildItemIds(section_id, typeName);
}

export function sectionGroupDisplayName(
  section_id: string,
  typeName: string,
  value: string,
): string {
  const itemId = `${value || ''}`.trim();
  if (isExistingChildItem(section_id, itemId, typeName)) {
    return `${uci.get(P99_UCI_PACKAGE, itemId, 'name') || itemId}`.trim();
  }

  const option = sectionGroupSourceOptions.get(typeName);
  const pending =
    option && option.pendingChildSettings
      ? option.pendingChildSettings[section_id]
      : null;
  const settings = pending && pending[itemId];
  return `${(settings && settings.name) || itemId}`.trim();
}

export function currentSectionGroupChoices(
  section_id: string,
  selectedValues: unknown = [],
): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  const result: Array<{ value: string; label: string }> = [];
  const append = (typeName: string, value: string) => {
    value = `${value || ''}`.trim();
    if (!value) {
      return;
    }

    const name = sectionGroupDisplayName(section_id, typeName, value) || value;
    if (seen.has(name)) {
      return;
    }

    seen.add(name);
    result.push({ value: name, label: name });
  };

  currentSectionGroupValues(section_id, 'urltest').forEach((value) =>
    append('urltest', value),
  );
  currentSectionGroupValues(section_id, 'priority_group').forEach((value) =>
    append('priority_group', value),
  );
  normalizeDynamicListItems(selectedValues).forEach((value) => {
    value = `${value || ''}`.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      result.push({ value, label: value });
    }
  });

  return result.sort((left, right) => left.label.localeCompare(right.label));
}

export function refreshDashboardFilterChoiceWidgets(section_id: string): void {
  const refreshers = dashboardFilterChoiceRefreshers.get(section_id);
  if (!refreshers) {
    return;
  }

  refreshers.forEach((refresh) => {
    if (refresh() === false) {
      refreshers.delete(refresh);
    }
  });

  if (refreshers.size === 0) {
    dashboardFilterChoiceRefreshers.delete(section_id);
  }
}

export function isDownloadThroughTargetSection(
  section: any,
  currentSectionId: string,
): boolean {
  const sectionName = getUciSectionName(section);
  const action = (section && section.action) || '';

  if (
    !sectionName ||
    sectionName === currentSectionId ||
    section.enabled === '0'
  ) {
    return false;
  }

  if (['connection', 'proxy', 'outbound', 'vpn'].includes(action)) {
    return true;
  }

  if (action === 'zapret') {
    return isZapretInstalledForUi();
  }

  if (action === 'zapret2') {
    return isZapret2InstalledForUi();
  }

  if (action === 'byedpi') {
    return isByedpiInstalledForUi();
  }

  return false;
}

export function subscriptionDownloadTargetChoices(
  section_id: string,
): Array<{ value: string; label: string }> {
  const sections =
    (typeof uci !== 'undefined' && typeof uci.sections === 'function'
      ? (uci as any).sections(P99_UCI_PACKAGE, 'section')
      : []) || [];
  return sections
    .filter((sec: any) => isDownloadThroughTargetSection(sec, section_id))
    .map((sec: any) => ({
      value: getUciSectionName(sec),
      label: getUciSectionLabel(sec),
    }));
}

export function globalSubscriptionChoices(): Array<{
  value: string;
  label: string;
}> {
  const subs =
    (typeof uci !== 'undefined' && typeof uci.sections === 'function'
      ? (uci as any).sections(P99_UCI_PACKAGE, 'subscription')
      : []) || [];
  return subs.map((sub: any) => ({
    value: getUciSectionName(sub),
    label: sub.label || sub.url || getUciSectionName(sub),
  }));
}

export function dnsTypeChoices(): Array<{ value: string; label: string }> {
  return typeof sectionDnsTypeChoices === 'function'
    ? sectionDnsTypeChoices()
    : [
        { value: 'doh', label: _('DNS over HTTPS (DoH)') },
        { value: 'dot', label: _('DNS over TLS (DoT)') },
        { value: 'udp', label: 'UDP' },
      ];
}

export function isConnectionNetworkInterfaceAllowed(
  deviceName: string,
  device?: any,
): boolean {
  if (CONNECTIONS_BLOCKED_INTERFACES.includes(deviceName)) {
    return false;
  }

  if (!device) {
    return true;
  }

  const type = device.getType();
  const isWireless =
    type === 'wifi' || type === 'wireless' || type.indexOf('wlan') >= 0;

  return !isWireless;
}

export function renderNetworkInterfaceChoice(device: any): HTMLElement {
  const name = device.getName();
  const type = device.getType();

  return E('span', {}, [
    E('img', {
      title: device.getI18n(),
      src: (L as any).resource(
        `icons/${type}${device.isUp() ? '' : '_disabled'}.svg`,
      ),
    }),
    E('span', { class: 'hide-open' }, [name]),
    E('span', { class: 'hide-close' }, [device.getI18n()]),
  ]);
}

export function renderNetworkInterfaceListItem(
  device: any,
  fallbackName: string,
): HTMLElement {
  const name = device ? device.getName() : fallbackName;
  const type = device ? device.getType() : 'ethernet';
  const up = device ? device.isUp() : false;

  return E('span', { class: 'fkp-interface-dynlist-label' }, [
    E('img', {
      title: device ? device.getI18n() : _('Network Interface'),
      src: (L as any).resource(`icons/${type}${up ? '' : '_disabled'}.svg`),
    }),
    E('span', {}, [name]),
  ]);
}

export function refreshNetworkInterfaceOptionValues(option: any): void {
  option.keylist = [];
  option.vallist = [];
  option.interfaceChoiceMap = {};
  option.interfaceDeviceMap = {};

  (option.devices || []).forEach((device: any) => {
    const name = device.getName();
    const type = device.getType();

    if (
      name === 'lo' ||
      type === 'alias' ||
      !isConnectionNetworkInterfaceAllowed(name, device)
    ) {
      return;
    }

    option.value(name, renderNetworkInterfaceChoice(device));
    option.interfaceChoiceMap[name] = true;
    option.interfaceDeviceMap[name] = device;
  });
}

export const InterfaceSettingsDynamicList: any = SettingsDynamicList.extend({
  load(section_id: string) {
    return network.getDevices().then((devices: any[]) => {
      this.devices = devices || [];
      refreshNetworkInterfaceOptionValues(this);

      return this.super('load', section_id);
    });
  },

  validate(section_id: string, value: string) {
    value = childItemInputValue(section_id, value, 'section_interface', 'name');

    if (!value || value.length === 0) {
      return true;
    }

    if (!this.interfaceChoiceMap || !this.interfaceChoiceMap[value]) {
      return _('Select an existing network interface');
    }

    return true;
  },

  renderListItemLabel(section_id: string, value: string, text: string) {
    value = childItemInputValue(section_id, value, 'section_interface', 'name');

    return renderNetworkInterfaceListItem(
      this.interfaceDeviceMap ? this.interfaceDeviceMap[value] : null,
      value || text,
    );
  },
});

export function urlTestFilterModeChoices(): Array<{
  value: string;
  label: string;
}> {
  return [
    { value: 'disabled', label: _('All servers') },
    { value: 'exclude', label: _('All except selected') },
    { value: 'include', label: _('Only selected') },
    { value: 'mixed', label: _('Only selected except exclusions') },
  ];
}

export function priorityLevelFilterModeChoices(): Array<{
  value: string;
  label: string;
}> {
  return [
    { value: 'disabled', label: _('All remaining servers') },
    { value: 'include', label: _('Only selected') },
    { value: 'exclude', label: _('All remaining except selected') },
    { value: 'mixed', label: _('Only selected except exclusions') },
  ];
}

export function serverCountryDetectionChoices(): Array<{
  value: string;
  label: string;
}> {
  return [
    { value: 'flag_emoji', label: _('By flag emoji from name') },
    { value: 'country_is', label: _('Via country.is') },
  ];
}

export function proxyProtocolChoices(): Array<[string, string]> {
  return [
    ['vless', 'VLESS'],
    ['vmess', 'VMess'],
    ['trojan', 'Trojan'],
    ['shadowsocks', 'Shadowsocks'],
    ['socks', 'SOCKS'],
    ['http', 'HTTP'],
    ['hysteria2', 'Hysteria2'],
    ['direct', 'Direct'],
  ];
}

export function proxyTransportChoices(): Array<[string, string]> {
  return [
    ['tcp', 'TCP'],
    ['ws', 'WebSocket'],
    ['grpc', 'gRPC'],
    ['http', 'HTTP'],
    ['httpupgrade', 'HTTPUpgrade'],
    ['xhttp', 'XHTTP'],
  ];
}

export function proxySecurityChoices(): Array<[string, string]> {
  return [
    ['none', 'None'],
    ['tls', 'TLS'],
    ['reality', 'Reality'],
  ];
}

export interface ProxyParameterFilterConfig {
  prefix: string;
  toggleLabel: string;
  toggleDescription: string;
  dependencies: Array<Record<string, string>>;
  protocolDescription: string;
  transportDescription: string;
  securityDescription: string;
}

export function addProxyParameterFilterOptions(
  itemSection: any,
  options: ProxyParameterFilterConfig,
): void {
  const prefix = options.prefix;
  const dependencies = options.dependencies;

  const o = itemSection.option(
    form.Flag,
    `${prefix}_proxy_parameters`,
    options.toggleLabel,
    options.toggleDescription,
  );
  dependencies.forEach((dependency) => o.depends(dependency));
  o.default = '0';
  o.rmempty = false;

  [
    [
      'protocols',
      _('Protocol'),
      options.protocolDescription,
      proxyProtocolChoices(),
    ],
    [
      'transports',
      _('Transport'),
      options.transportDescription,
      proxyTransportChoices(),
    ],
    [
      'securities',
      _('Security'),
      options.securityDescription,
      proxySecurityChoices(),
    ],
  ].forEach(([suffix, label, description, choices]) => {
    const list = itemSection.option(
      form.DynamicList,
      `${prefix}_${suffix}`,
      label,
      description,
    );
    dependencies.forEach((dependency) =>
      list.depends(
        Object.assign({}, dependency, {
          [`${prefix}_proxy_parameters`]: '1',
        }),
      ),
    );
    list.rmempty = true;
    (choices as Array<[string, string]>).forEach(([value, choiceLabel]) =>
      list.value(value, choiceLabel),
    );
    list.placeholder = _('-- Select --');
  });
}

export function urlTestUrlChoices(): string[] {
  return Array.isArray(LATENCY_TEST_URL_OPTIONS)
    ? LATENCY_TEST_URL_OPTIONS
    : [DEFAULT_LATENCY_TEST_URL || 'https://www.gstatic.com/generate_204'];
}

export function validateUrlTestTolerance(value: unknown): boolean | string {
  if (!value || `${value}`.length === 0) {
    return _('Must be a number in the range of 0 - 10000');
  }

  const normalized = `${value}`;
  const parsed = parseFloat(normalized);
  if (
    /^[0-9]+$/.test(normalized) &&
    !isNaN(parsed) &&
    isFinite(parsed) &&
    parsed >= 0 &&
    parsed <= 10000
  ) {
    return true;
  }

  return _('Must be a number in the range of 0 - 10000');
}

export function validateUrlTestUrl(value: unknown): boolean | string {
  const validation = validateUrl(`${value || ''}`.trim());
  return validation.valid ? true : validation.message;
}

export function optionMapValue(
  option: any,
  section_id: string,
  key: string,
): unknown {
  const value =
    option && option.map && option.map.data
      ? option.map.data.get(option.map.config, section_id, key)
      : uci.get(P99_UCI_PACKAGE, section_id, key);

  return value == null ? '' : value;
}

export function subscriptionUrlSettingsKeys(): string[] {
  return [
    'subscription_update_enabled',
    'subscription_update_interval',
    'download_via_proxy_enabled',
    'download_via_proxy_section',
    'prefix_nodes',
    'node_prefix',
    'include_urltest_groups',
  ];
}

export function defaultSubscriptionUrlSettings(): Record<string, string> {
  return {
    subscription_update_enabled: '1',
    subscription_update_interval: '4h',
    download_via_proxy_enabled: '0',
    download_via_proxy_section: '',
    prefix_nodes: '0',
    node_prefix: '',
    include_urltest_groups: '1',
  };
}

export function flintnetSubscriptionUrl(value: unknown): boolean {
  try {
    return (
      new URL(`${value || ''}`.trim()).hostname.toLowerCase() ===
      'sub.flintnet.pro'
    );
  } catch (_error) {
    return false;
  }
}

export function subscriptionUrlChildDefaults(): Record<string, unknown> {
  return Object.assign(defaultSubscriptionUrlSettings(), {
    include_urltest_groups: (value: string) =>
      flintnetSubscriptionUrl(value) ? '0' : '1',
  });
}

export function interfaceSettingsKeys(): string[] {
  return [
    'domain_resolver_enabled',
    'domain_resolver_dns_type',
    'domain_resolver_dns_server',
  ];
}

export function defaultInterfaceSettings(): Record<string, string> {
  return {
    domain_resolver_enabled: '0',
    domain_resolver_dns_type: 'udp',
    domain_resolver_dns_server: '8.8.8.8',
  };
}

export function subscriptionUserAgentChoices(): string[] {
  return [
    'sing-box',
    'Happ',
    'v2rayN',
    'v2rayNG',
    'v2RayTun',
    'Incy',
    'Hiddify',
    'HiddifyNext',
    'Clash',
    'Clash.Meta',
    'ClashMetaForAndroid',
    'Mihomo',
    'NekoBox',
    'Karing',
    'Husi',
  ];
}

export function urlTestSettingsKeys(): string[] {
  return [
    'name',
    'check_interval',
    'tolerance',
    'testing_url',
    'idle_timeout',
    'interrupt_exist_connections',
    'pin_dashboard',
    'filter_mode',
    'detect_server_country',
    'include_countries',
    'include_outbounds',
    'include_regex',
    'include_proxy_parameters',
    'include_protocols',
    'include_transports',
    'include_securities',
    'exclude_countries',
    'exclude_outbounds',
    'exclude_regex',
    'exclude_proxy_parameters',
    'exclude_protocols',
    'exclude_transports',
    'exclude_securities',
  ];
}

export function defaultUrlTestSettings(_name?: string): Record<string, string> {
  return {
    name: '',
    check_interval: '3m',
    tolerance: '50',
    testing_url: 'https://www.gstatic.com/generate_204',
    idle_timeout: '30m',
    interrupt_exist_connections: '1',
    pin_dashboard: '1',
    filter_mode: 'disabled',
    detect_server_country: 'flag_emoji',
  };
}

export function urlTestChildDefaults(): Record<string, string> {
  return {
    check_interval: '3m',
    tolerance: '50',
    testing_url: 'https://www.gstatic.com/generate_204',
    idle_timeout: '30m',
    interrupt_exist_connections: '1',
    pin_dashboard: '1',
    filter_mode: 'disabled',
    detect_server_country: 'flag_emoji',
  };
}

export function priorityGroupSettingsKeys(): string[] {
  return [
    'name',
    'health_url',
    'active_check_interval',
    'check_timeout',
    'recovery_check_interval',
    'pick_fastest',
    'switch_to_faster_same_priority',
    'fastest_check_interval',
    'interrupt_exist_connections',
    'pin_dashboard',
  ];
}

export function defaultPriorityGroupSettings(): Record<string, string> {
  return {
    name: '',
    health_url: 'https://www.gstatic.com/generate_204',
    active_check_interval: '5s',
    check_timeout: '2s',
    recovery_check_interval: '15s',
    pick_fastest: '0',
    switch_to_faster_same_priority: '0',
    fastest_check_interval: '3m',
    interrupt_exist_connections: '1',
    pin_dashboard: '1',
  };
}

export function priorityGroupChildDefaults(): Record<string, string> {
  return {
    health_url: 'https://www.gstatic.com/generate_204',
    active_check_interval: '5s',
    check_timeout: '2s',
    recovery_check_interval: '15s',
    pick_fastest: '0',
    switch_to_faster_same_priority: '0',
    fastest_check_interval: '3m',
    interrupt_exist_connections: '1',
    pin_dashboard: '1',
  };
}

export function priorityLevelSettingsKeys(): string[] {
  return [
    'name',
    'order',
    'direct',
    'filter_mode',
    'detect_server_country',
    'country',
    'server_name',
    'regex',
    'include_proxy_parameters',
    'include_protocols',
    'include_transports',
    'include_securities',
    'exclude_countries',
    'exclude_outbounds',
    'exclude_regex',
    'exclude_proxy_parameters',
    'exclude_protocols',
    'exclude_transports',
    'exclude_securities',
  ];
}

export function defaultPriorityLevelSettings(): Record<string, string> {
  return {
    name: '',
    order: '0',
    direct: '0',
    filter_mode: 'include',
    detect_server_country: 'flag_emoji',
  };
}

export function randomPriorityGroupId(): string {
  for (let i = 0; i < 100; i += 1) {
    const value = Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0');
    const id = `pg_${value}`;

    if (!uci.get(P99_UCI_PACKAGE, id)) {
      return id;
    }
  }

  return `pg_${Date.now().toString(16)}`;
}

export function parentSectionIdForItem(itemId: string): string {
  return (uci.get(P99_UCI_PACKAGE, itemId, 'section') as string) || '';
}

export function validateRegex(
  _section_id: unknown,
  value: string,
): boolean | string {
  if (!value || !value.length) {
    return true;
  }

  try {
    new RegExp(value);
    return true;
  } catch (_error) {
    return _('Invalid regular expression');
  }
}

export function validateKeyword(
  _section_id: unknown,
  value: string,
): boolean | string {
  if (!value || !value.length) {
    return true;
  }

  if (/[,\s]/.test(value)) {
    return _('Keyword must not contain spaces or commas');
  }

  return true;
}

export function addSubscriptionUrlItemOptions(
  itemSection: any,
  options: { parentSectionId?: (id: string) => string } = {},
): void {
  const parentSectionForItem =
    typeof options.parentSectionId === 'function'
      ? options.parentSectionId
      : parentSectionIdForItem;

  let o = itemSection.option(
    form.Flag,
    'subscription_update_enabled',
    _('Subscription auto update'),
    _('Update this subscription automatically'),
  );
  o.default = '1';
  o.rmempty = false;

  o = itemSection.option(
    form.Value,
    'subscription_update_interval',
    _('Subscription update interval'),
    _('Use sing-box duration format like 1d, 12h or 30m'),
  );
  o.depends('subscription_update_enabled', '1');
  o.placeholder = '4h';
  o.validate = function (this: any, itemId: string, value: string) {
    return optionMapValue(this, itemId, 'subscription_update_enabled') === '1'
      ? validateRequiredSingBoxDuration(value)
      : validateOptionalSingBoxDuration(value);
  };

  o = itemSection.option(
    form.Flag,
    'download_via_proxy_enabled',
    _('Download subscription through a section'),
    _('Download subscriptions via the selected section'),
  );
  o.default = '0';
  o.rmempty = false;

  o = itemSection.option(
    form.ListValue,
    'download_via_proxy_section',
    _('Download through'),
  );
  o.depends('download_via_proxy_enabled', '1');
  o.load = function (this: any, itemId: string) {
    const sectionId = parentSectionForItem(itemId);
    refreshOptionChoices(this, subscriptionDownloadTargetChoices(sectionId));
    return optionMapValue(this, itemId, 'download_via_proxy_section') || '';
  };
  o.validate = function (this: any, itemId: string, value: string) {
    const sectionId = parentSectionForItem(itemId);
    if (optionMapValue(this, itemId, 'download_via_proxy_enabled') !== '1') {
      return true;
    }
    if (!value) {
      return _('Select a section for downloading this subscription');
    }
    if (value === sectionId) {
      return _('Current section cannot download its own subscription');
    }
    return true;
  };

  o = itemSection.option(
    form.Flag,
    'prefix_nodes',
    _('Add prefix to nodes'),
    _(
      'Automatically add text to the name of each server from this subscription for convenient filtering.',
    ),
  );
  o.default = '0';
  o.rmempty = false;

  o = itemSection.option(form.Value, 'node_prefix', _('Prefix text'));
  o.depends('prefix_nodes', '1');
  o.rmempty = false;

  o = itemSection.option(
    form.Flag,
    'include_urltest_groups',
    _('Import subscription URLTest groups'),
    _('Import URLTest groups returned by this subscription provider'),
  );
  o.default = '1';
  o.rmempty = false;
}

export function addInterfaceItemOptions(itemSection: any): void {
  let o = itemSection.option(
    form.Flag,
    'domain_resolver_enabled',
    _('Domain Resolver'),
    _('Enable built-in DNS resolver for domains handled by this section'),
  );
  o.default = '0';
  o.rmempty = false;

  o = itemSection.option(
    form.ListValue,
    'domain_resolver_dns_type',
    _('DNS protocol'),
    _('DNS protocol used by the resolver'),
  );
  o.depends('domain_resolver_enabled', '1');
  dnsTypeChoices().forEach((choice) => o.value(choice.value, choice.label));
  o.default = 'udp';

  o = itemSection.option(
    form.Value,
    'domain_resolver_dns_server',
    _('DNS server'),
    _('DNS server used by the resolver'),
  );
  o.depends('domain_resolver_enabled', '1');
  o.default = '8.8.8.8';
  o.validate = function (this: any, itemId: string, value: string) {
    if (optionMapValue(this, itemId, 'domain_resolver_enabled') !== '1') {
      return true;
    }
    const validation = validateUrlTestUrl(value);
    return validation === true ? true : validation;
  };
}

export function addUrlTestItemOptions(
  itemSection: any,
  options: { parentSectionId?: (id: string) => string } = {},
): void {
  const parentSectionForItem =
    typeof options.parentSectionId === 'function'
      ? options.parentSectionId
      : parentSectionIdForItem;

  let o = itemSection.option(
    form.Value,
    'name',
    _('Display name'),
    _('Name displayed on the dashboard'),
  );
  o.rmempty = false;
  o.load = function (this: any, itemId: string) {
    return (
      optionMapValue(this, itemId, 'name') ||
      optionMapValue(this, itemId, 'display_name') ||
      ''
    );
  };
  o.validate = function (_itemId: string, value: string) {
    return `${value || ''}`.trim() ? true : _('Enter a display name');
  };

  o = itemSection.option(
    form.Value,
    'check_interval',
    _('Check interval'),
    _('Use sing-box duration format like 1d, 12h or 30m'),
  );
  o.default = '3m';
  o.rmempty = false;
  o.validate = function (_itemId: string, value: string) {
    return validateRequiredSingBoxDuration(value);
  };

  o = itemSection.option(
    form.Value,
    'tolerance',
    _('Tolerance'),
    _(
      'Minimum latency difference in milliseconds that triggers switching to a faster server.',
    ),
  );
  o.default = '50';
  o.rmempty = false;
  o.validate = function (_itemId: string, value: string) {
    return validateUrlTestTolerance(value);
  };

  o = itemSection.option(
    form.Value,
    'testing_url',
    _('Check URL'),
    _('URL used to test server latency'),
  );
  o.default = 'https://www.gstatic.com/generate_204';
  o.rmempty = false;
  urlTestUrlChoices().forEach((value) => o.value(value));
  o.validate = function (_itemId: string, value: string) {
    return validateUrlTestUrl(value);
  };

  o = itemSection.option(
    form.Value,
    'idle_timeout',
    _('Idle timeout'),
    _(
      'Stop checking when URLTest group is not used. Use sing-box duration format like 1d, 12h or 30m.',
    ),
  );
  o.default = '30m';
  o.rmempty = false;
  o.validate = function (_itemId: string, value: string) {
    return validateRequiredSingBoxDuration(value);
  };

  o = itemSection.option(
    form.Flag,
    'interrupt_exist_connections',
    _('Interrupt connections'),
    _('Interrupt connections when URLTest switches the selected server'),
  );
  o.default = '1';
  o.rmempty = false;

  o = itemSection.option(
    form.Flag,
    'pin_dashboard',
    _('Pin on dashboard'),
    _(
      'Pin URLTest group to the top of the dashboard outbound list, before latency-sorted servers',
    ),
  );
  o.default = '1';
  o.rmempty = false;

  o = itemSection.option(
    form.ListValue,
    'filter_mode',
    _('Server filtering'),
    _('Allows limiting the list of servers for URLTest'),
  );
  urlTestFilterModeChoices().forEach((choice) =>
    o.value(choice.value, choice.label),
  );
  o.default = 'disabled';

  o = itemSection.option(
    form.ListValue,
    'detect_server_country',
    _('Detect server country'),
  );
  o.depends('filter_mode', 'exclude');
  o.depends('filter_mode', 'include');
  o.depends('filter_mode', 'mixed');
  serverCountryDetectionChoices().forEach((choice) =>
    o.value(choice.value, choice.label),
  );
  o.default = 'flag_emoji';

  const includeProxyParameterOptions: ProxyParameterFilterConfig = {
    prefix: 'include',
    toggleLabel: _('Include by proxy parameters'),
    toggleDescription: _(
      'Additionally filter servers by protocol, transport, and security. Add only servers matching the specified parameters.',
    ),
    dependencies: [{ filter_mode: 'include' }, { filter_mode: 'mixed' }],
    protocolDescription: _(
      'Test only servers with one of the selected protocols.',
    ),
    transportDescription: _(
      'Test only servers with one of the selected transports.',
    ),
    securityDescription: _(
      'Test only servers with one of the selected security types.',
    ),
  };
  const excludeProxyParameterOptions: ProxyParameterFilterConfig = {
    prefix: 'exclude',
    toggleLabel: _('Exclude by proxy parameters'),
    toggleDescription: _(
      'Additionally exclude servers by protocol, transport, and security. Exclude only servers matching the specified parameters.',
    ),
    dependencies: [{ filter_mode: 'exclude' }, { filter_mode: 'mixed' }],
    protocolDescription: _(
      'Do not test servers with one of the selected protocols.',
    ),
    transportDescription: _(
      'Do not test servers with one of the selected transports.',
    ),
    securityDescription: _(
      'Do not test servers with one of the selected security types.',
    ),
  };

  [
    [
      'include_countries',
      _('Include countries'),
      _(
        'Test servers only from the specified countries. E.g. DE, NL, US (2-letter ISO codes).',
      ),
      countryChoices(),
      validateCountryCode,
      ['include', 'mixed'],
    ],
    [
      'include_outbounds',
      _('Include servers'),
      _('Test only selected servers.'),
      null,
      null,
      ['include', 'mixed'],
    ],
    [
      'include_regex',
      _('Include by regular expression'),
      _(
        'Test servers whose names match the expression. E.g. (?i)fast|direct|premium',
      ),
      null,
      validateRegex,
      ['include', 'mixed'],
    ],
    [
      'exclude_countries',
      _('Exclude countries'),
      _(
        'Do not test servers from these countries. E.g. RU, CN (2-letter ISO codes).',
      ),
      countryChoices(),
      validateCountryCode,
      ['exclude', 'mixed'],
    ],
    [
      'exclude_outbounds',
      _('Exclude servers'),
      _('Do not test specified servers.'),
      null,
      null,
      ['exclude', 'mixed'],
    ],
    [
      'exclude_regex',
      _('Exclude by regular expression'),
      _('Do not test servers whose names match the expression.'),
      null,
      validateRegex,
      ['exclude', 'mixed'],
    ],
  ].forEach(([key, label, description, choices, validator, modes]) => {
    const list = itemSection.option(form.DynamicList, key, label, description);
    (modes as string[]).forEach((mode) => list.depends('filter_mode', mode));
    list.rmempty = true;
    if (choices) {
      (choices as Array<{ value: string; label: string }>).forEach((choice) =>
        list.value(choice.value, choice.label),
      );
      list.placeholder = _('-- Select --');
    }
    if ((key as string).endsWith('_outbounds')) {
      list.load = function (this: any, itemId: string) {
        const sectionId = parentSectionForItem(itemId);
        const values = normalizeOptionValues(
          optionMapValue(this, itemId, key as string),
        );

        return loadOutboundNameChoices(sectionId).then(() => {
          refreshOptionChoices(
            this,
            currentOutboundNameChoices(sectionId, values),
          );
          return values;
        });
      };
      list.placeholder = _('-- Select --');
      configureLiveDynamicListChoices(list, (itemId, values) =>
        currentOutboundNameChoices(parentSectionForItem(itemId), values),
      );
    }
    if (validator) {
      list.validate = function (_itemId: string, value: string) {
        return (validator as any)(null, value);
      };
    }
    if (key === 'include_regex') {
      addProxyParameterFilterOptions(itemSection, includeProxyParameterOptions);
    } else if (key === 'exclude_regex') {
      addProxyParameterFilterOptions(itemSection, excludeProxyParameterOptions);
    }
  });
}

export function priorityLevelSettingsForValidation(
  groupId: string,
  levelId: string,
  option: any,
): Record<string, unknown> {
  const store = childPendingSettingsStore(option, groupId);

  if (isExistingChildItem(groupId, levelId, 'priority_level', 'group')) {
    return readChildSettings(
      levelId,
      priorityLevelSettingsKeys(),
      defaultPriorityLevelSettings(),
    );
  }

  return Object.assign({}, store[levelId] || {});
}

export function validatePriorityLevelItemsBeforeSave(
  groupId: string,
  values: unknown,
  option: any,
): boolean | string {
  const normalizedValues = normalizeDynamicListItems(values);

  for (const value of normalizedValues) {
    const levelId = `${value || ''}`;
    const settings = priorityLevelSettingsForValidation(
      groupId,
      levelId,
      option,
    );

    if (!`${settings.name || ''}`.trim()) {
      return _('Enter a level name');
    }
  }

  return true;
}

export function addPriorityLevelItemOptions(
  itemSection: any,
  options: { parentSectionId?: (id: string) => string } = {},
): void {
  const parentSectionForItem =
    typeof options.parentSectionId === 'function'
      ? options.parentSectionId
      : parentSectionIdForItem;

  let o = itemSection.option(
    form.Value,
    'name',
    _('Level name'),
    _('Name shown in the priority level list'),
  );
  o.rmempty = false;
  o.validate = function (_itemId: string, value: string) {
    return `${value || ''}`.trim() ? true : _('Enter a level name');
  };

  o = itemSection.option(
    form.Flag,
    'direct',
    _('Direct connection'),
    _('Traffic for this level goes directly.'),
  );
  o.default = '0';
  o.rmempty = false;

  o = itemSection.option(
    form.ListValue,
    'filter_mode',
    _('Server filtering'),
    _(
      'All remaining servers means every server not already assigned to a higher-priority level.',
    ),
  );
  priorityLevelFilterModeChoices().forEach((choice) =>
    o.value(choice.value, choice.label),
  );
  o.default = 'include';
  o.depends('direct', '0');

  o = itemSection.option(
    form.ListValue,
    'detect_server_country',
    _('Detect server country'),
  );
  ['exclude', 'include', 'mixed'].forEach((mode) =>
    o.depends({ direct: '0', filter_mode: mode }),
  );
  serverCountryDetectionChoices().forEach((choice) =>
    o.value(choice.value, choice.label),
  );
  o.default = 'flag_emoji';

  const includeProxyParameterOptions: ProxyParameterFilterConfig = {
    prefix: 'include',
    toggleLabel: _('Include by proxy parameters'),
    toggleDescription: _(
      'Additionally filter servers by protocol, transport, and security. Add only servers matching the specified parameters.',
    ),
    dependencies: [
      { direct: '0', filter_mode: 'include' },
      { direct: '0', filter_mode: 'mixed' },
    ],
    protocolDescription: _('Only servers with one of the selected protocols.'),
    transportDescription: _(
      'Only servers with one of the selected transports.',
    ),
    securityDescription: _(
      'Only servers with one of the selected security types.',
    ),
  };
  const excludeProxyParameterOptions: ProxyParameterFilterConfig = {
    prefix: 'exclude',
    toggleLabel: _('Exclude by proxy parameters'),
    toggleDescription: _(
      'Additionally exclude servers by protocol, transport, and security. Exclude only servers matching the specified parameters.',
    ),
    dependencies: [
      { direct: '0', filter_mode: 'exclude' },
      { direct: '0', filter_mode: 'mixed' },
    ],
    protocolDescription: _(
      'Exclude servers with one of the selected protocols from this level.',
    ),
    transportDescription: _(
      'Exclude servers with one of the selected transports from this level.',
    ),
    securityDescription: _(
      'Exclude servers with one of the selected security types from this level.',
    ),
  };

  [
    [
      'country',
      _('Include countries'),
      _('Only from the specified countries.'),
      countryChoices(),
      validateCountryCode,
      ['include', 'mixed'],
    ],
    [
      'server_name',
      _('Include servers'),
      _('Only the specified servers.'),
      null,
      null,
      ['include', 'mixed'],
    ],
    [
      'regex',
      _('Include by regular expression'),
      _('Only servers whose names match the expression.'),
      null,
      validateRegex,
      ['include', 'mixed'],
    ],
    [
      'exclude_countries',
      _('Exclude countries'),
      _('Remove servers from the specified countries from this level.'),
      countryChoices(),
      validateCountryCode,
      ['exclude', 'mixed'],
    ],
    [
      'exclude_outbounds',
      _('Exclude servers'),
      _('Remove the specified servers from this level.'),
      null,
      null,
      ['exclude', 'mixed'],
    ],
    [
      'exclude_regex',
      _('Exclude by regular expression'),
      _('Remove servers whose names match the expression from this level.'),
      null,
      validateRegex,
      ['exclude', 'mixed'],
    ],
  ].forEach(([key, label, description, choices, validator, modes]) => {
    const list = itemSection.option(form.DynamicList, key, label, description);
    (modes as string[]).forEach((mode) =>
      list.depends({ direct: '0', filter_mode: mode }),
    );
    list.rmempty = true;
    if (choices) {
      (choices as Array<{ value: string; label: string }>).forEach((choice) =>
        list.value(choice.value, choice.label),
      );
      list.placeholder = _('-- Select --');
    }
    if (key === 'server_name' || key === 'exclude_outbounds') {
      list.load = function (this: any, itemId: string) {
        const sectionId = parentSectionForItem(itemId);
        const values = normalizeOptionValues(
          optionMapValue(this, itemId, key as string),
        );

        return loadOutboundNameChoices(sectionId).then(() => {
          refreshOptionChoices(
            this,
            currentOutboundNameChoices(sectionId, values),
          );
          return values;
        });
      };
      list.placeholder = _('-- Select --');
      configureLiveDynamicListChoices(list, (itemId, values) =>
        currentOutboundNameChoices(parentSectionForItem(itemId), values),
      );
    }
    if (validator) {
      list.validate = function (_itemId: string, value: string) {
        return (validator as any)(null, value);
      };
    }
    if (key === 'regex') {
      addProxyParameterFilterOptions(itemSection, includeProxyParameterOptions);
    } else if (key === 'exclude_regex') {
      addProxyParameterFilterOptions(itemSection, excludeProxyParameterOptions);
    }
  });
}

export function addPriorityGroupItemOptions(
  itemSection: any,
  options: {
    parentSectionId?: (id: string) => string;
    ownerId?: () => string;
  } = {},
): void {
  const parentSectionForGroup =
    typeof options.parentSectionId === 'function'
      ? options.parentSectionId
      : parentSectionIdForItem;
  const ownerId =
    typeof options.ownerId === 'function' ? options.ownerId : () => '';

  let o = itemSection.option(
    form.Value,
    'name',
    _('Display name'),
    _('Name displayed on the dashboard'),
  );
  o.rmempty = false;
  o.validate = function (_itemId: string, value: string) {
    return `${value || ''}`.trim() ? true : _('Enter a display name');
  };

  o = itemSection.option(
    form.Value,
    'health_url',
    _('Check URL'),
    _('URL used to check whether a server is alive'),
  );
  o.default = 'https://www.gstatic.com/generate_204';
  o.rmempty = false;
  urlTestUrlChoices().forEach((value) => o.value(value));
  o.validate = function (_itemId: string, value: string) {
    return validateUrlTestUrl(value);
  };

  o = itemSection.option(
    form.Value,
    'active_check_interval',
    _('Check interval'),
    _('How often the currently selected server is checked'),
  );
  o.default = '5s';
  o.rmempty = false;
  o.validate = function (_itemId: string, value: string) {
    return validateRequiredSingBoxDuration(value);
  };

  o = itemSection.option(
    form.Value,
    'check_timeout',
    _('Unavailability timeout'),
    _('Check timeout after which the server is considered dead'),
  );
  o.default = '2s';
  o.rmempty = false;
  o.validate = function (_itemId: string, value: string) {
    return validateRequiredSingBoxDuration(value);
  };

  o = itemSection.option(
    form.Value,
    'recovery_check_interval',
    _('Higher-level check interval'),
    _(
      'How often higher priority levels are checked while a lower level is active',
    ),
  );
  o.default = '15s';
  o.rmempty = false;
  o.validate = function (_itemId: string, value: string) {
    return validateRequiredSingBoxDuration(value);
  };

  o = itemSection.option(
    form.Flag,
    'pick_fastest',
    _('Select the fastest node'),
    _(
      'When switching to another level, test every server and select the fastest instead of the first working one.',
    ),
  );
  o.default = '0';
  o.rmempty = false;

  o = itemSection.option(
    form.Flag,
    'switch_to_faster_same_priority',
    _('Automatically select the fastest node in the current level'),
    _(
      'Periodically check the current level and switch to a faster server even when the current one works.',
    ),
  );
  o.default = '0';
  o.rmempty = false;

  o = itemSection.option(
    form.Value,
    'fastest_check_interval',
    _('Faster server search interval'),
    _('Use sing-box duration format like 1d, 12h or 30m'),
  );
  o.depends('switch_to_faster_same_priority', '1');
  o.default = '3m';
  o.rmempty = false;
  o.validate = function (this: any, itemId: string, value: string) {
    return optionMapValue(this, itemId, 'switch_to_faster_same_priority') ===
      '1'
      ? validateRequiredSingBoxDuration(value)
      : true;
  };

  o = itemSection.option(
    form.Flag,
    'interrupt_exist_connections',
    _('Interrupt connections'),
    _('Interrupt connections when priority failover switches server'),
  );
  o.default = '1';
  o.rmempty = false;

  o = itemSection.option(
    form.Flag,
    'pin_dashboard',
    _('Pin on dashboard'),
    _(
      'Pin Priority group to the top of the dashboard outbound list, before latency-sorted servers',
    ),
  );
  o.default = '1';
  o.rmempty = false;

  o = itemSection.option(
    ButtonAddSettingsDynamicList,
    'priority_level',
    _('Priority levels'),
    _('Top level has the highest priority; lower levels are used as fallback'),
  );
  o.rmempty = true;
  o.modalonly = true;
  o.addButtonLabel = _('+ Add level');
  o.childType = 'priority_level';
  o.ownerOption = 'group';
  o.childOwnerId = ownerId;
  o.parentSectionId = parentSectionForGroup;
  o.childValueOption = 'name';
  o.childDefaults = defaultPriorityLevelSettings();
  o.renderItemSettingsModal = showPriorityLevelSettingsModal;
  o.validateItemsOnSave = function (
    this: any,
    groupId: string,
    values: unknown,
  ) {
    return validatePriorityLevelItemsBeforeSave(groupId, values, this);
  };
  o.hasItemSettings = function (groupId: string, value: unknown) {
    const normalized = `${value || ''}`.trim();

    if (isExistingChildItem(groupId, normalized, 'priority_level', 'group')) {
      return true;
    }

    return normalized.length > 0;
  };
  o.inputValueForItem = function (this: any, groupId: string, value: unknown) {
    const inputValue = childItemInputValue(
      groupId,
      value as string,
      'priority_level',
      'name',
      'group',
    );
    const store = childPendingSettingsStore(this, groupId);
    return store[inputValue] && store[inputValue].name
      ? store[inputValue].name
      : inputValue;
  };
  o.stagedChildSettings = function (
    this: any,
    groupId: string,
    value: unknown,
  ) {
    const id = childItemInputValue(
      groupId,
      value as string,
      'priority_level',
      'name',
      'group',
    );
    const store = childPendingSettingsStore(this, groupId);
    return store[id] ? Object.assign({}, store[id]) : null;
  };
  o.clearStagedChildSettings = function (this: any, groupId: string) {
    if (this.pendingChildSettings) {
      delete this.pendingChildSettings[groupId];
    }
  };
  o.afterMaterializeChildItems = function (
    _groupId: string,
    itemIds: string[],
  ) {
    itemIds.forEach((itemId, index) => {
      uci.set(P99_UCI_PACKAGE, itemId, 'order', `${index}`);
    });
  };
  o.renderListItemLabel = function (
    this: any,
    groupId: string,
    itemId: string,
  ) {
    return E(
      'span',
      { class: 'fkp-dynlist-label' },
      this.inputValueForItem(groupId, itemId),
    );
  };
}

export function addDashboardGroupFilterOption(
  optionSection: any,
  key: string,
  label: string,
  description: string,
  modes: string[],
): void {
  const list = optionSection.option(form.DynamicList, key, label, description);
  modes.forEach((mode) => {
    list.depends({
      action: 'connection',
      dashboard_filter_mode: mode,
      urltest: /.+/,
    });
    list.depends({
      action: 'connection',
      dashboard_filter_mode: mode,
      priority_group: /.+/,
    });
  });
  list.rmempty = true;
  list.placeholder = _('-- Select --');
  list.load = function (section_id: string) {
    const values = getConfigListValues(section_id, key);
    const choices = currentSectionGroupChoices(section_id, values);
    refreshOptionChoices(this, choices);
    return values;
  };
  list.validate = function (section_id: string, value: unknown) {
    const selected = new Set(
      currentSectionGroupChoices(section_id).map((choice) => choice.value),
    );
    return normalizeDynamicListItems(value).every((item) => selected.has(item))
      ? true
      : _('Select an existing URLTest or Priority group');
  };
  configureLiveDynamicListChoices(list, currentSectionGroupChoices);
}

export function addDashboardServerFilterOptions(section: any): void {
  const optionSection = {
    option: (optionType: any, ...args: any[]) => {
      const option = section.taboption('advanced', optionType, ...args);
      option.modalonly = true;
      return option;
    },
  };
  let o = optionSection.option(
    form.ListValue,
    'dashboard_filter_mode',
    _('Servers on dashboard'),
    _('Filter the servers that will be displayed on the dashboard.'),
  );
  urlTestFilterModeChoices().forEach((choice) =>
    o.value(choice.value, choice.label),
  );
  o.default = 'disabled';
  o.depends('action', 'connection');

  o = optionSection.option(
    form.ListValue,
    'dashboard_detect_server_country',
    _('Detect server country'),
  );
  ['exclude', 'include', 'mixed'].forEach((mode) =>
    o.depends({ action: 'connection', dashboard_filter_mode: mode }),
  );
  serverCountryDetectionChoices().forEach((choice) =>
    o.value(choice.value, choice.label),
  );
  o.default = 'flag_emoji';

  const includeProxyParameterOptions: ProxyParameterFilterConfig = {
    prefix: 'dashboard_include',
    toggleLabel: _('Include by proxy parameters'),
    toggleDescription: _(
      'Additionally show servers by protocol, transport, and security. Add only servers matching the specified parameters.',
    ),
    dependencies: [
      { action: 'connection', dashboard_filter_mode: 'include' },
      { action: 'connection', dashboard_filter_mode: 'mixed' },
    ],
    protocolDescription: _(
      'Show only servers with one of the selected protocols.',
    ),
    transportDescription: _(
      'Show only servers with one of the selected transports.',
    ),
    securityDescription: _(
      'Show only servers with one of the selected security types.',
    ),
  };
  const excludeProxyParameterOptions: ProxyParameterFilterConfig = {
    prefix: 'dashboard_exclude',
    toggleLabel: _('Exclude by proxy parameters'),
    toggleDescription: _(
      'Additionally hide servers by protocol, transport, and security. Hide servers matching the specified parameters.',
    ),
    dependencies: [
      { action: 'connection', dashboard_filter_mode: 'exclude' },
      { action: 'connection', dashboard_filter_mode: 'mixed' },
    ],
    protocolDescription: _('Hide servers with one of the selected protocols.'),
    transportDescription: _(
      'Hide servers with one of the selected transports.',
    ),
    securityDescription: _(
      'Hide servers with one of the selected security types.',
    ),
  };

  [
    [
      'dashboard_include_countries',
      _('Include countries'),
      _('Show servers only from the specified countries.'),
      countryChoices(),
      validateCountryCode,
      ['include', 'mixed'],
    ],
    [
      'dashboard_include_outbounds',
      _('Include servers'),
      _('Show only selected servers.'),
      null,
      null,
      ['include', 'mixed'],
    ],
    [
      'dashboard_include_regex',
      _('Include by regular expression'),
      _('Show servers whose names match the expression.'),
      null,
      validateRegex,
      ['include', 'mixed'],
    ],
    [
      'dashboard_exclude_countries',
      _('Exclude countries'),
      _('Hide servers from the specified countries.'),
      countryChoices(),
      validateCountryCode,
      ['exclude', 'mixed'],
    ],
    [
      'dashboard_exclude_outbounds',
      _('Exclude servers'),
      _('Hide selected servers.'),
      null,
      null,
      ['exclude', 'mixed'],
    ],
    [
      'dashboard_exclude_regex',
      _('Exclude by regular expression'),
      _('Hide servers whose names match the expression.'),
      null,
      validateRegex,
      ['exclude', 'mixed'],
    ],
  ].forEach(([key, label, description, choices, validator, modes]) => {
    const list = optionSection.option(
      form.DynamicList,
      key,
      label,
      description,
    );
    (modes as string[]).forEach((mode) =>
      list.depends({ action: 'connection', dashboard_filter_mode: mode }),
    );
    list.rmempty = true;
    if (choices) {
      (choices as Array<{ value: string; label: string }>).forEach((choice) =>
        list.value(choice.value, choice.label),
      );
      list.placeholder = _('-- Select --');
    }
    if ((key as string).endsWith('_outbounds')) {
      list.load = function (section_id: string) {
        const values = getConfigListValues(section_id, key as string);
        loadOutboundNameChoices(section_id).then(() => {
          refreshDashboardFilterChoiceWidgets(section_id);
        });
        return values;
      };
      list.placeholder = _('-- Select --');
      configureLiveDynamicListChoices(list, currentOutboundNameChoices);
    }
    if (validator) {
      list.validate = function (_section_id: string, value: string) {
        return (validator as any)(null, value);
      };
    }
    if (key === 'dashboard_include_regex') {
      addDashboardGroupFilterOption(
        optionSection,
        'dashboard_include_groups',
        _('Add URLTest / Priority group'),
        _(
          'Show servers from selected groups without repeating their filtering criteria.',
        ),
        ['include', 'mixed'],
      );
      addProxyParameterFilterOptions(
        optionSection,
        includeProxyParameterOptions,
      );
    } else if (key === 'dashboard_exclude_regex') {
      addDashboardGroupFilterOption(
        optionSection,
        'dashboard_exclude_groups',
        _('Exclude URLTest / Priority group'),
        _(
          'Hide servers from selected groups without repeating their filtering criteria.',
        ),
        ['exclude', 'mixed'],
      );
      addProxyParameterFilterOptions(
        optionSection,
        excludeProxyParameterOptions,
      );
    }
  });
}

export { settingValueEquals };

export function validateUrlTestItemsBeforeSave(
  section_id: string,
  values: unknown,
  option: any,
): boolean | string {
  const store = childPendingSettingsStore(option, section_id);

  for (const value of normalizeDynamicListItems(values)) {
    const itemId = `${value || ''}`;
    let name = '';

    if (isExistingChildItem(section_id, itemId, 'urltest')) {
      name =
        (uci.get(P99_UCI_PACKAGE, itemId, 'name') as string) ||
        (uci.get(P99_UCI_PACKAGE, itemId, 'display_name') as string) ||
        '';
    } else if (store[itemId]) {
      name = (store[itemId].name as string) || '';
    }

    if (!`${name || ''}`.trim()) {
      return _('Enter a display name');
    }
  }

  return true;
}

export function validatePriorityGroupItemsBeforeSave(
  section_id: string,
  values: unknown,
): boolean | string {
  for (const value of normalizeDynamicListItems(values)) {
    const groupId = `${value || ''}`.trim();

    if (!isExistingChildItem(section_id, groupId, 'priority_group')) {
      return _('Open priority settings and enter a display name');
    }

    if (!`${uci.get(P99_UCI_PACKAGE, groupId, 'name') || ''}`.trim()) {
      return _('Enter a display name');
    }
  }

  return true;
}

export function validateOutboundJsonItemsBeforeSave(
  _section_id: string,
  values: unknown,
): boolean | string {
  const items = Array.isArray(values) ? values : values ? [values] : [];
  const tags: string[] = [];

  for (const value of items) {
    const validation = validateOutboundJson(`${value || ''}`, tags);
    if (!validation.valid) {
      const tag = outboundJsonDisplayTag(value);
      return tag ? `${tag}: ${validation.message}` : validation.message;
    }

    const tag = outboundJsonDisplayTag(value);
    tags.push(tag);
  }

  return true;
}
