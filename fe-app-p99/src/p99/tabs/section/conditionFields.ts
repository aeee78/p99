import { DOMAIN_LIST_OPTIONS, P99_UCI_PACKAGE } from '../../../constants';
import { parseValueList } from '../../../helpers/parseValueList';
import { validateDomain } from '../../../validators/validateDomain';
import { validateSubnet } from '../../../validators/validateSubnet';
import {
  parseCommentAwareListTokens,
  uniqueDomainTextValues,
} from '../../section/textListAnalysis';
import { createLocalDeviceDynamicListWidget } from '../../helpers/localDevices';
import {
  addAnnotationIssue,
  configureTextareaOption,
  finalizeAnnotations,
  type TextareaAnalysisResult,
} from './annotatedTextarea';
import { getConfigListValues, writeListOption } from './childItemsManager';
import {
  getDuplicateValueText,
  getValidationHeaderText,
} from './dpiValidation';
import { validateKeyword, validateRegex } from './itemOptions';

export const ROUTING_ACTIONS = [
  'connection',
  'proxy',
  'outbound',
  'vpn',
  'bypass',
  'block',
  'zapret',
  'zapret2',
  'byedpi',
];

export function dependsOnRoutingAction(option: any): any {
  ROUTING_ACTIONS.forEach((action) => option.depends('action', action));
  return option;
}

export function dependsOnRuleConditions(option: any): any {
  const routingConditions = [
    'domain',
    'ip_cidr',
    'community_lists',
    'rule_set',
    'domain_ip_lists',
    'ports',
  ];
  ROUTING_ACTIONS.forEach((action) =>
    routingConditions.forEach((condition) =>
      option.depends({ action, [condition]: /\S/ }),
    ),
  );
  [
    'domain',
    'community_lists',
    '_dns_rule_set',
    '_dns_domain_ip_lists',
  ].forEach((condition) =>
    option.depends({ action: 'dns', [condition]: /\S/ }),
  );
  return option;
}

export function valuesToText(values: unknown): string {
  if (!values) {
    return '';
  }

  if (Array.isArray(values)) {
    return values.filter(Boolean).join('\n');
  }

  return `${values}`.trim();
}

export function validatePortCondition(
  _section_id: unknown,
  value: unknown,
): boolean | string {
  const normalized = value ? `${value}`.trim() : '';

  if (!normalized.length) {
    return true;
  }

  const match = normalized.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) {
    return _('Invalid port or range. Use 80 or 1000-2000');
  }

  const start = Number.parseInt(match[1], 10);
  const end = match[2] ? Number.parseInt(match[2], 10) : start;

  if (start < 1 || start > 65535 || end < 1 || end > 65535) {
    return _('Port must be between 1 and 65535');
  }

  if (start > end) {
    return _('Port range start must be less than or equal to end');
  }

  return true;
}

export function analyzeTextListValue(
  value: unknown,
  validateItem: (item: string) => { valid: boolean; message?: string },
  emptyMessage: string,
  options: {
    duplicateMessage?: string;
    normalizeDuplicateValue?: (item: string) => string;
  } = {},
): TextareaAnalysisResult {
  const text = value ? `${value}` : '';
  if (!text.length) {
    return { valid: true, message: '', annotations: [] };
  }

  const tokens = parseCommentAwareListTokens(text);
  if (!tokens.length) {
    return { valid: false, message: emptyMessage, annotations: [] };
  }

  const duplicateMessage = options.duplicateMessage || getDuplicateValueText();
  const annotationMap = new Map<
    string,
    { start: number; end: number; messages: string[] }
  >();
  const errors: string[] = [];
  const seen = new Set<string>();

  tokens.forEach((token) => {
    if (typeof validateItem === 'function') {
      const validation = validateItem(token.value);
      if (!validation.valid) {
        errors.push(`${token.value}: ${validation.message}`);
        addAnnotationIssue(annotationMap, token, validation.message || '');
      }
    }

    const normalized = options.normalizeDuplicateValue
      ? options.normalizeDuplicateValue(token.value)
      : token.value;

    if (!normalized) {
      return;
    }

    if (seen.has(normalized)) {
      errors.push(`${token.value}: ${duplicateMessage}`);
      addAnnotationIssue(annotationMap, token, duplicateMessage);
      return;
    }

    seen.add(normalized);
  });

  if (!errors.length) {
    return { valid: true, message: '', annotations: [] };
  }

  return {
    valid: false,
    message: [getValidationHeaderText(), ...errors].join('\n'),
    annotations: finalizeAnnotations(annotationMap),
  };
}

export function analyzeDomainSuffixText(
  value: unknown,
): TextareaAnalysisResult {
  const validateDomainCondition = (domain: string) => {
    const normalized = `${domain || ''}`.trim();
    if (normalized.includes('/')) {
      return { valid: false, message: _('Invalid domain address') };
    }

    return validateDomain(normalized, true);
  };

  return analyzeTextListValue(
    value,
    (item) => {
      const colonIndex = item.indexOf(':');
      const prefix = colonIndex > 0 ? item.slice(0, colonIndex) : '';
      const body = colonIndex > 0 ? item.slice(colonIndex + 1) : item;

      if (!prefix) {
        return validateDomainCondition(body);
      }

      if (!['full', 'keyword', 'regex'].includes(prefix)) {
        return {
          valid: false,
          message: _('Allowed domain prefixes are full:, keyword:, and regex:'),
        };
      }

      if (!body.length) {
        return { valid: false, message: _('Value cannot be empty') };
      }

      if (prefix === 'full') {
        return validateDomainCondition(body);
      }

      if (prefix === 'keyword') {
        const validation = validateKeyword(null, body);
        return validation === true
          ? { valid: true, message: _('Valid') }
          : { valid: false, message: validation as string };
      }

      if (/[,\s]/.test(body)) {
        return {
          valid: false,
          message: _('Regular expression must not contain spaces or commas'),
        };
      }

      const validation = validateRegex(null, body);
      return validation === true
        ? { valid: true, message: _('Valid') }
        : { valid: false, message: validation as string };
    },
    _('At least one valid domain must be specified.'),
    {
      normalizeDuplicateValue: (item) => `${item}`.toLowerCase(),
    },
  );
}

export function analyzeIpCidrText(value: unknown): TextareaAnalysisResult {
  return analyzeTextListValue(
    value,
    (item) => validateSubnet(item),
    _('At least one valid IP or subnet must be specified.'),
    {
      normalizeDuplicateValue: (item) => `${item}`.trim(),
    },
  );
}

export function domainValuesWithPrefix(
  section_id: string,
  key: string,
  prefix: string,
): string[] {
  return getConfigListValues(section_id, key).map((value) =>
    prefix ? `${prefix}:${value}` : value,
  );
}

export function domainTextValuesWithPrefix(
  section_id: string,
  key: string,
  prefix: string,
): string[] {
  const legacyText = uci.get(
    P99_UCI_PACKAGE,
    section_id,
    `${key}_text`,
  ) as string;
  if (!legacyText) {
    return [];
  }

  return parseValueList(legacyText).map((value) =>
    prefix ? `${prefix}:${value}` : value,
  );
}

export function appendUniqueDomainTextValues(
  textValue: unknown,
  values: string[],
): string {
  const originalText = typeof textValue === 'string' ? textValue : '';
  const seen = new Set(
    parseValueList(originalText).map((value) => `${value}`.toLowerCase()),
  );
  const additions = uniqueDomainTextValues(values).filter((value) => {
    const key = `${value}`.toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  if (!additions.length) {
    return originalText;
  }

  const base = originalText.replace(/\s+$/, '');
  return [base, ...additions].filter(Boolean).join('\n');
}

export function loadCombinedDomainText(section_id: string): string {
  const textValue =
    uci.get(P99_UCI_PACKAGE, section_id, 'domain') ||
    uci.get(P99_UCI_PACKAGE, section_id, 'domain_suffix_text');
  const values = [
    ...domainValuesWithPrefix(section_id, 'domain_suffix', ''),
    ...domainValuesWithPrefix(section_id, 'domain_keyword', 'keyword'),
    ...domainValuesWithPrefix(section_id, 'domain_regex', 'regex'),
    ...domainTextValuesWithPrefix(section_id, 'domain_suffix', ''),
    ...domainTextValuesWithPrefix(section_id, 'domain', 'full'),
    ...domainTextValuesWithPrefix(section_id, 'domain_keyword', 'keyword'),
    ...domainTextValuesWithPrefix(section_id, 'domain_regex', 'regex'),
  ];

  return appendUniqueDomainTextValues(textValue, values);
}

export function loadRulesetValues(option: any): void {
  delete option.keylist;
  delete option.vallist;

  Object.entries(DOMAIN_LIST_OPTIONS).forEach(([key, label]) => {
    option.value(key, _(label));
  });
}

export function addDynamicConditionField(section: any, config: any): any {
  const o = section.taboption(
    'conditions',
    form.DynamicList,
    config.key,
    config.label,
    config.description,
  );

  o.modalonly = true;
  if (config.placeholder) {
    o.placeholder = config.placeholder;
  }
  if (config.dynamicValidate) {
    o.validate = config.dynamicValidate;
  }

  o.load = function (section_id: string) {
    const values = getConfigListValues(section_id, config.key);
    if (values.length) {
      return values;
    }

    const legacyText = uci.get(
      P99_UCI_PACKAGE,
      section_id,
      `${config.key}_text`,
    ) as string;
    return legacyText ? parseValueList(legacyText) : [];
  };

  o.write = function (section_id: string, value: unknown) {
    writeListOption(section_id, config.key, value);
    uci.unset(P99_UCI_PACKAGE, section_id, `${config.key}_text`);
    uci.unset(P99_UCI_PACKAGE, section_id, `${config.key}_text_mode`);
  };

  return o;
}

export function addLocalDeviceSubnetDynamicField(
  section: any,
  config: any,
): any {
  const o = section.taboption(
    config.tab || 'clients',
    form.DynamicList,
    config.key,
    config.label,
    config.description,
  );

  o.modalonly = true;
  o.placeholder = _('Device or IP');
  o.validate = function (_section_id: unknown, value: unknown) {
    if (!value || (value as string).length === 0) {
      return true;
    }

    const validation = validateSubnet(value as string);
    return validation.valid ? true : validation.message;
  };
  o.load = function (section_id: string) {
    const values = getConfigListValues(section_id, config.key);
    if (values.length) {
      return values;
    }

    const legacyText = uci.get(
      P99_UCI_PACKAGE,
      section_id,
      `${config.key}_text`,
    ) as string;
    return legacyText ? parseValueList(legacyText) : [];
  };
  o.write = function (section_id: string, value: unknown) {
    writeListOption(section_id, config.key, value);
    uci.unset(P99_UCI_PACKAGE, section_id, `${config.key}_text`);
    uci.unset(P99_UCI_PACKAGE, section_id, `${config.key}_text_mode`);
  };
  o.renderWidget = function (
    this: any,
    section_id: string,
    _option_index: number,
    cfgvalue: unknown,
  ) {
    return createLocalDeviceDynamicListWidget(this, section_id, cfgvalue);
  };

  return o;
}

export function addTextConditionField(section: any, config: any): any {
  const optionName = config.optionName || `${config.key}_text`;
  const legacyTextOptionName =
    config.legacyTextOptionName || `${config.key}_text`;
  const o = section.taboption(
    'conditions',
    form.TextValue,
    optionName,
    config.label,
    config.description,
  );

  o.rows = 8;
  o.wrap = 'soft';
  o.textarea = true;
  o.modalonly = true;
  if (config.textAnalyze) {
    o.validate = function (_section_id: unknown, value: unknown) {
      const analysis = config.textAnalyze(value);
      return analysis.valid ? true : analysis.message;
    };
  } else if (config.textValidate) {
    o.validate = config.textValidate;
  }
  configureTextareaOption(o, config.textAnalyze);

  o.load = function (section_id: string) {
    if (typeof config.loadText === 'function') {
      return config.loadText(section_id);
    }

    const textValue =
      uci.get(P99_UCI_PACKAGE, section_id, optionName) ||
      uci.get(P99_UCI_PACKAGE, section_id, legacyTextOptionName);
    if (textValue) {
      return valuesToText(textValue);
    }

    return valuesToText(uci.get(P99_UCI_PACKAGE, section_id, config.key));
  };

  o.write = function (section_id: string, value: unknown) {
    const normalized = value ? `${value}`.trim() : '';

    if (normalized.length) {
      uci.set(P99_UCI_PACKAGE, section_id, optionName, normalized);
    } else {
      uci.unset(P99_UCI_PACKAGE, section_id, optionName);
    }

    if (config.key !== optionName) {
      uci.unset(P99_UCI_PACKAGE, section_id, config.key);
    }
    if (legacyTextOptionName !== optionName) {
      uci.unset(P99_UCI_PACKAGE, section_id, legacyTextOptionName);
    }
    uci.unset(P99_UCI_PACKAGE, section_id, `${config.key}_text_mode`);

    if (typeof config.afterWrite === 'function') {
      config.afterWrite(section_id);
    }
  };

  return o;
}
