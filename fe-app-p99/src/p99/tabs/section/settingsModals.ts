import { P99_UCI_PACKAGE } from '../../../constants';
import {
  cleanFormSectionData,
  uniqueDynamicListItems,
} from '../../section/childItems';
import { STACKED_SETTINGS_VALIDATION_SUMMARY_CLASS } from '../../section/modalTabs';
import { validateOutboundJson } from '../../../validators/validateOutboundJson';
import { configureTextareaOption } from './annotatedTextarea';
import {
  applyChildItemSettings,
  changedSettings,
  childItemInputValue,
  childPendingSettingsStore,
  getConfigListValues,
  getCustomRulesetReferences,
  hasChangedSettings,
  isExistingChildItem,
  itemSettingsFlag,
  outboundJsonDisplayTag,
  pendingChildSettings,
  readChildSettings,
  readItemSettingsMap,
  RULE_SET_ITEM_SETTINGS_KEY,
  writeListOption,
} from './childItemsManager';
import {
  addDynamicListItem,
  addInterfaceItemOptions,
  addPriorityGroupItemOptions,
  addPriorityLevelItemOptions,
  addSubscriptionUrlItemOptions,
  addUrlTestItemOptions,
  defaultInterfaceSettings,
  defaultPriorityGroupSettings,
  defaultPriorityLevelSettings,
  defaultSubscriptionUrlSettings,
  defaultUrlTestSettings,
  dynamicListItemCurrentValue,
  interfaceSettingsKeys,
  priorityGroupChildDefaults,
  priorityGroupSettingsKeys,
  priorityLevelSettingsKeys,
  randomPriorityGroupId,
  setDynamicListItemValue,
  subscriptionUrlSettingsKeys,
  updateDynamicListItemLabel,
  urlTestSettingsKeys,
} from './itemOptions';

export function renderStackedJsonSettingsModal(
  title: string,
  map: any,
  onSave: (settings: Record<string, unknown>) => void,
): Promise<void> {
  const modal = document.querySelector('#modal_overlay > .modal.cbi-modal');
  const activeMap = modal ? modal.querySelector('.cbi-map:not(.hidden)') : null;
  const buttonRow = modal ? modal.querySelector('div.button-row') : null;
  const heading = modal ? modal.querySelector('h4') : null;

  if (!modal || !activeMap || !buttonRow || !heading) {
    return Promise.resolve();
  }

  return map.render().then((nodes: HTMLElement) => {
    const titleNode = E('span', {}, title ? ` » ${title}` : '');
    const originalButtonClass = buttonRow.getAttribute('class') || '';
    const originalButtonNodes = Array.from(buttonRow.childNodes);
    let closed = false;
    let saveButton: HTMLButtonElement | null = null;
    let validationSummary: HTMLElement | null = null;

    const clearValidationSummary = () => {
      if (validationSummary && validationSummary.parentNode) {
        validationSummary.parentNode.removeChild(validationSummary);
      }
      validationSummary = null;
    };

    const showValidationSummary = (error: any) => {
      clearValidationSummary();

      const message = error?.message || '';
      validationSummary = E(
        'div',
        {
          class: `alert-message warning ${STACKED_SETTINGS_VALIDATION_SUMMARY_CLASS}`,
        },
        [
          E('strong', {}, _('Cannot save settings')),
          E('div', {}, _('Fix the highlighted fields and save again.')),
          message ? E('small', {}, message) : '',
        ],
      );
      buttonRow.parentNode?.insertBefore(validationSummary, buttonRow);

      const invalidInput = nodes.querySelector(
        '.cbi-input-invalid',
      ) as HTMLElement | null;
      if (invalidInput) {
        invalidInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
        invalidInput.focus({ preventScroll: true });
      }
    };

    const restoreButtonRow = () => {
      buttonRow.textContent = '';
      originalButtonNodes.forEach((node) => buttonRow.appendChild(node));
      buttonRow.setAttribute('class', originalButtonClass);
    };

    const close = () => {
      if (closed) {
        return;
      }

      closed = true;
      clearValidationSummary();

      if (nodes.parentNode) {
        nodes.parentNode.removeChild(nodes);
      }
      if (titleNode.parentNode) {
        titleNode.parentNode.removeChild(titleNode);
      }

      activeMap.classList.remove('hidden');
      restoreButtonRow();
    };

    const save = () => {
      if (saveButton) {
        saveButton.disabled = true;
      }
      clearValidationSummary();

      return map
        .parse()
        .then(() => {
          onSave(
            cleanFormSectionData(
              map.data.get(map.config, 'settings'),
            ) as Record<string, unknown>,
          );
          close();
        })
        .catch((error: unknown) => {
          if (saveButton) {
            saveButton.disabled = false;
          }
          showValidationSummary(error);
        });
    };

    buttonRow.textContent = '';
    buttonRow.append(
      E(
        'button',
        {
          class: 'btn cbi-button',
          click: close,
        },
        _('Close'),
      ),
      ' ',
      (saveButton = E(
        'button',
        {
          class: 'btn cbi-button cbi-button-positive important',
          click: save,
        },
        _('Save'),
      )),
    );

    heading.appendChild(titleNode);
    activeMap.classList.add('hidden');
    activeMap.parentNode?.insertBefore(nodes, activeMap.nextElementSibling);
  });
}

export interface ChildItemModalSettings {
  typeName: string;
  valueOption: string;
  ownerOption?: string;
  keys: string[];
  defaults:
    | Record<string, unknown>
    | ((name: string) => Record<string, unknown>);
  addOptions: (itemSection: any, context?: any) => void;
  title: (name: string) => string;
  afterSave?: (
    itemId: string,
    inputValue: string,
    settings: Record<string, unknown>,
    existing: boolean,
  ) => void;
}

export function showChildItemSettingsModal(
  section_id: string,
  itemValue: string,
  option: any,
  settings: ChildItemModalSettings,
): Promise<void> {
  const value = `${itemValue || ''}`.trim();
  const existing = isExistingChildItem(
    section_id,
    value,
    settings.typeName,
    settings.ownerOption,
  );
  const inputValue = childItemInputValue(
    section_id,
    value,
    settings.typeName,
    settings.valueOption,
    settings.ownerOption,
  );
  const defaults =
    typeof settings.defaults === 'function'
      ? settings.defaults(inputValue)
      : Object.assign({}, settings.defaults || {});
  const initialSettings = existing
    ? readChildSettings(value, settings.keys, defaults)
    : Object.assign(
        {},
        pendingChildSettings(option, section_id, inputValue, defaults),
      );
  const data = {
    settings: Object.assign({}, initialSettings),
  };
  const map = new (form as any).JSONMap(data);
  const itemSection = map.section((form as any).NamedSection, 'settings');
  itemSection.anonymous = true;
  itemSection.addremove = false;
  settings.addOptions(itemSection, {
    parentSectionId: () => section_id,
    ownerId: () => value || section_id,
  });

  return renderStackedJsonSettingsModal(
    settings.title(inputValue),
    map,
    (nextSettings) => {
      if (existing) {
        const diff = changedSettings(
          initialSettings,
          nextSettings,
          settings.keys,
        );
        if (hasChangedSettings(diff)) {
          applyChildItemSettings(value, diff);
        }
        if (typeof settings.afterSave === 'function') {
          settings.afterSave(value, inputValue, nextSettings, existing);
        }
        return;
      }

      const nextInputValue =
        `${nextSettings[settings.valueOption] || inputValue || ''}`.trim();
      const store = childPendingSettingsStore(option, section_id);
      if (nextInputValue !== inputValue) {
        delete store[inputValue];
      }
      store[nextInputValue] = nextSettings;
      if (typeof settings.afterSave === 'function') {
        settings.afterSave(value, nextInputValue, nextSettings, existing);
      }
    },
  );
}

export function showSubscriptionUrlSettingsModal(
  _section_id: string,
  itemValue: string,
  option: any,
): Promise<void> {
  return showChildItemSettingsModal(_section_id, itemValue, option, {
    typeName: 'subscription_url',
    valueOption: 'url',
    keys: subscriptionUrlSettingsKeys(),
    defaults: defaultSubscriptionUrlSettings(),
    addOptions: addSubscriptionUrlItemOptions,
    title: () => _('Subscription URL settings'),
  });
}

export function showInterfaceSettingsModal(
  _section_id: string,
  itemValue: string,
  option: any,
): Promise<void> {
  return showChildItemSettingsModal(_section_id, itemValue, option, {
    typeName: 'section_interface',
    valueOption: 'name',
    keys: interfaceSettingsKeys(),
    defaults: defaultInterfaceSettings(),
    addOptions: addInterfaceItemOptions,
    title: () => _('Network interface settings'),
  });
}

export function showUrlTestSettingsModal(
  _section_id: string,
  itemValue: string,
  option: any,
  widget?: any,
  itemNode?: HTMLElement,
  context: { adding?: boolean } = {},
): Promise<void> {
  return showChildItemSettingsModal(_section_id, itemValue, option, {
    typeName: 'urltest',
    valueOption: 'name',
    keys: urlTestSettingsKeys(),
    defaults: defaultUrlTestSettings,
    addOptions: addUrlTestItemOptions,
    title: (name: string) => {
      const normalized = `${name || ''}`.trim();
      return !normalized || /^urltest-[a-z0-9]+-\d+$/.test(normalized)
        ? _('URLTest settings')
        : `${_('URLTest settings')}: ${normalized}`;
    },
    afterSave: (itemId, inputValue, settings, existing) => {
      const displayName = `${settings.name || inputValue || ''}`.trim();

      if (existing) {
        uci.unset(P99_UCI_PACKAGE, itemId, 'id');
        uci.unset(P99_UCI_PACKAGE, itemId, 'display_name');
        if (itemNode) {
          updateDynamicListItemLabel(itemNode, displayName);
        }
        return;
      }

      if (context.adding && widget) {
        addDynamicListItem(widget, displayName, displayName);
      } else if (itemNode) {
        updateDynamicListItemLabel(itemNode, displayName);
      }
    },
  });
}

export function showPriorityLevelSettingsModal(
  groupId: string,
  itemValue: string,
  option: any,
  widget?: any,
  itemNode?: HTMLElement,
  context: { adding?: boolean; parentSectionId?: string } = {},
): Promise<void> {
  return showChildItemSettingsModal(groupId, itemValue, option, {
    typeName: 'priority_level',
    ownerOption: 'group',
    valueOption: 'name',
    keys: priorityLevelSettingsKeys(),
    defaults: defaultPriorityLevelSettings(),
    addOptions: (itemSection) =>
      addPriorityLevelItemOptions(itemSection, {
        parentSectionId: () => context.parentSectionId || '',
      }),
    title: (name: string) => {
      const normalized = `${name || ''}`.trim();
      return normalized
        ? `${_('Priority level settings')}: ${normalized}`
        : _('Priority level settings');
    },
    afterSave: (_itemId, inputValue, settings, existing) => {
      const displayName = `${settings.name || inputValue || ''}`.trim();

      if (existing) {
        if (itemNode) {
          updateDynamicListItemLabel(itemNode, displayName);
        }
        return;
      }

      if (context.adding && widget) {
        addDynamicListItem(widget, displayName, displayName);
      } else if (itemNode) {
        updateDynamicListItemLabel(itemNode, displayName);
      }
    },
  });
}

export function createPriorityGroupItem(
  section_id: string,
  groupId: string,
  settings: Record<string, unknown>,
): string {
  const created =
    (typeof (uci as any).add === 'function'
      ? (uci as any).add(P99_UCI_PACKAGE, 'priority_group', groupId)
      : groupId) || groupId;

  uci.set(P99_UCI_PACKAGE, created, 'section', section_id);
  Object.entries(priorityGroupChildDefaults()).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      uci.set(P99_UCI_PACKAGE, created, key, `${value}`);
    }
  });
  applyChildItemSettings(created, settings);

  return created;
}

export function showPriorityGroupSettingsModal(
  section_id: string,
  itemValue: string,
  option: any,
  widget?: any,
  itemNode?: HTMLElement,
  context: { adding?: boolean } = {},
): Promise<void> | null {
  const groupId = context.adding
    ? randomPriorityGroupId()
    : `${itemValue || ''}`.trim();

  if (!groupId) {
    return null;
  }

  return showChildItemSettingsModal(section_id, groupId, option, {
    typeName: 'priority_group',
    valueOption: 'name',
    keys: priorityGroupSettingsKeys(),
    defaults: defaultPriorityGroupSettings(),
    addOptions: addPriorityGroupItemOptions,
    title: (name: string) => {
      if (context.adding) {
        return _('Priority settings');
      }

      const normalized = `${name || ''}`.trim();
      return normalized
        ? `${_('Priority settings')}: ${normalized}`
        : _('Priority settings');
    },
    afterSave: (_itemId, inputValue, settings, existing) => {
      const displayName = `${settings.name || inputValue || ''}`.trim();

      if (!existing) {
        const created = createPriorityGroupItem(section_id, groupId, settings);
        const store = childPendingSettingsStore(option, section_id);
        delete store[groupId];
        delete store[inputValue];
        delete store[displayName];
        if (widget) {
          addDynamicListItem(widget, created, displayName);
        }
        return;
      }

      if (itemNode) {
        updateDynamicListItemLabel(itemNode, displayName);
      }
    },
  });
}

export function showOutboundJsonSettingsModal(
  _section_id: string,
  itemValue: string,
  _option: any,
  widget?: any,
  itemNode?: HTMLElement,
  context: { adding?: boolean } = {},
): Promise<void> {
  const data = {
    settings: {
      outbound_json: `${itemValue || ''}`,
    },
  };
  const map = new (form as any).JSONMap(data);
  const itemSection = map.section((form as any).NamedSection, 'settings');
  itemSection.anonymous = true;
  itemSection.addremove = false;

  const jsonOption = itemSection.option(
    (form as any).TextValue,
    'outbound_json',
    _('JSON outbound'),
    _('Enter a complete sing-box outbound object'),
  );
  jsonOption.rows = 12;
  jsonOption.wrap = 'soft';
  jsonOption.textarea = true;
  jsonOption.modalonly = true;
  jsonOption.rmempty = false;
  jsonOption.validate = function (_itemId: string, value: string) {
    const usedTags =
      widget && widget.node
        ? Array.from(widget.node.querySelectorAll('.item'))
            .filter((item) => item !== itemNode)
            .map((item: any) =>
              outboundJsonDisplayTag(dynamicListItemCurrentValue(item, '')),
            )
            .filter(Boolean)
        : [];
    const validation = validateOutboundJson(`${value || ''}`, usedTags);
    return validation.valid ? true : validation.message;
  };
  configureTextareaOption(jsonOption);

  return renderStackedJsonSettingsModal(
    _('JSON outbound settings'),
    map,
    (settings) => {
      const value = `${settings.outbound_json || ''}`.trim();
      if (context.adding && widget) {
        addDynamicListItem(widget, value);
        return;
      }

      if (itemNode) {
        setDynamicListItemValue(itemNode, value);
        updateDynamicListItemLabel(itemNode, outboundJsonDisplayTag(value));
      }
      if (
        widget &&
        widget.node &&
        typeof widget.dispatchCbiDynlistChange === 'function'
      ) {
        widget.dispatchCbiDynlistChange(widget.node, value);
      }
    },
  );
}

export function ruleSetIncludesSubnets(
  section_id: string,
  value: string,
): boolean {
  const settings = readItemSettingsMap(section_id, RULE_SET_ITEM_SETTINGS_KEY);
  const itemSettings = settings && (settings[value] as Record<string, unknown>);

  if (
    itemSettings &&
    typeof itemSettings === 'object' &&
    itemSettings.include_subnets != null
  ) {
    return itemSettingsFlag(itemSettings, 'include_subnets', false);
  }

  return (
    getConfigListValues(section_id, 'rule_set_with_subnets') as string[]
  ).includes(value);
}

export function showRuleSetSettingsModal(
  section_id: string,
  itemValue: string,
  option: any,
  widget: any,
): Promise<void> {
  const data = {
    settings: {
      include_subnets: ruleSetIncludesSubnets(section_id, itemValue)
        ? '1'
        : '0',
    },
  };
  const map = new (form as any).JSONMap(data);
  const section = map.section((form as any).NamedSection, 'settings');
  section.anonymous = true;
  section.addremove = false;

  const includeSubnets = section.option(
    form.Flag,
    'include_subnets',
    _('Include IP addresses and subnets'),
    _('Subnets from the list will be extracted and added to nftables'),
  );
  includeSubnets.default = '0';
  includeSubnets.rmempty = false;

  return renderStackedJsonSettingsModal(
    _('Rule set settings'),
    map,
    (settings) => {
      const value = settings.include_subnets === '1';
      const refs = uniqueDynamicListItems(
        widget && typeof widget.getValue === 'function'
          ? widget.getValue()
          : getCustomRulesetReferences(section_id),
      );
      const subnets = new Set(
        (
          getConfigListValues(section_id, 'rule_set_with_subnets') as string[]
        ).filter((ref: string) => refs.includes(ref)),
      );

      if (value) {
        subnets.add(itemValue);
      } else {
        subnets.delete(itemValue);
      }

      writeListOption(
        section_id,
        'rule_set',
        refs.filter((ref) => !subnets.has(ref)),
      );
      writeListOption(section_id, 'rule_set_with_subnets', [...subnets]);
      if (option && typeof option.getUIElement === 'function') {
        option.getUIElement(section_id).setValue(refs);
      }
    },
  );
}
