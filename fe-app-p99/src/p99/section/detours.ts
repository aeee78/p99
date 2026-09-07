import { P99_UCI_PACKAGE } from '../../constants';

export interface UciSectionLike {
  ['.name']?: string;
  name?: string;
  label?: string;
  action?: string;
  enabled?: string;
  [key: string]: unknown;
}

export interface ProviderAvailability {
  isZapretInstalled?: boolean;
  isZapret2Installed?: boolean;
  isByedpiInstalled?: boolean;
}

export interface DetourOptionTarget {
  keylist?: string[];
  vallist?: string[];
  value: (key: string, label?: string) => void;
}

export function getUciSectionName(
  section: UciSectionLike | string | null | undefined,
): string {
  if (!section) {
    return '';
  }
  if (typeof section === 'string') {
    return section.trim();
  }
  return `${section['.name'] || section.name || ''}`.trim();
}

export function getUciSectionLabel(
  section: UciSectionLike | null | undefined,
): string {
  return (section && section.label) || getUciSectionName(section);
}

const OUTBOUND_ACTIONS = new Set(['connection', 'proxy', 'outbound', 'vpn']);

export function isOutboundDetourTargetSection(
  section: UciSectionLike | null | undefined,
  currentSectionId: string,
): boolean {
  if (!section) {
    return false;
  }
  const sectionName = getUciSectionName(section);
  const action = (section.action || '').trim();

  return (
    Boolean(sectionName) &&
    sectionName !== currentSectionId &&
    section.enabled !== '0' &&
    OUTBOUND_ACTIONS.has(action)
  );
}

function loadConfigSections(): UciSectionLike[] {
  if (typeof uci !== 'undefined' && typeof uci.sections === 'function') {
    const sections = uci.sections(P99_UCI_PACKAGE, 'section');
    return Array.isArray(sections) ? (sections as UciSectionLike[]) : [];
  }
  return [];
}

export function getOutboundDetourTargetSections(
  currentSectionId: string,
  allSections?: UciSectionLike[],
): UciSectionLike[] {
  const sections = allSections ?? loadConfigSections();
  return sections.filter((section) =>
    isOutboundDetourTargetSection(section, currentSectionId),
  );
}

export function getDefaultOutboundDetourSection(
  currentSectionId: string,
  allSections?: UciSectionLike[],
): string {
  const targetSections = getOutboundDetourTargetSections(
    currentSectionId,
    allSections,
  );
  return targetSections.length ? getUciSectionName(targetSections[0]) : '';
}

export function refreshOutboundDetourSectionOptionValues(
  option: DetourOptionTarget,
  sectionId: string,
  allSections?: UciSectionLike[],
): void {
  option.keylist = [];
  option.vallist = [];

  getOutboundDetourTargetSections(sectionId, allSections).forEach(
    (targetSection) => {
      option.value(
        getUciSectionName(targetSection),
        getUciSectionLabel(targetSection),
      );
    },
  );
}

export function isDnsDetourTargetSection(
  section: UciSectionLike | null | undefined,
  currentSectionId: string,
  providers: ProviderAvailability = {},
): boolean {
  if (!section) {
    return false;
  }
  const sectionName = getUciSectionName(section);
  const action = (section.action || '').trim();

  if (
    !sectionName ||
    sectionName === currentSectionId ||
    section.enabled === '0'
  ) {
    return false;
  }

  if (OUTBOUND_ACTIONS.has(action)) {
    return true;
  }
  if (action === 'zapret') {
    return Boolean(providers.isZapretInstalled);
  }
  if (action === 'zapret2') {
    return Boolean(providers.isZapret2Installed);
  }
  if (action === 'byedpi') {
    return Boolean(providers.isByedpiInstalled);
  }
  return false;
}

export function refreshDnsDetourSectionOptionValues(
  option: DetourOptionTarget,
  sectionId: string,
  allSections?: UciSectionLike[],
  providers?: ProviderAvailability,
): void {
  option.keylist = [];
  option.vallist = [];

  const sections = allSections ?? loadConfigSections();
  sections
    .filter((section) =>
      isDnsDetourTargetSection(section, sectionId, providers),
    )
    .forEach((targetSection) => {
      option.value(
        getUciSectionName(targetSection),
        getUciSectionLabel(targetSection),
      );
    });
}
