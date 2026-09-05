import { P99 } from '../../../types';

function normalizeText(value?: string): string {
  return (value || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function getOutboundFooterLabel(outbound: P99.Outbound): string {
  if (outbound.priorityInfo?.selectedName) {
    return outbound.priorityInfo.selectedName;
  }

  if (outbound.urlTestInfo) {
    const selected = outbound.urlTestInfo.selectedName;
    const cleanGroup = (
      outbound.cleanDisplayName ||
      outbound.displayName ||
      ''
    ).trim();

    // For "Fastest" group, always show the active selected node name
    if (
      outbound.code.toLowerCase().includes('urltest') ||
      cleanGroup.toLowerCase() === 'fastest'
    ) {
      return selected || outbound.protocolStack || 'URLTest';
    }

    if (selected) {
      const normGroup = normalizeText(cleanGroup);
      const normSelected = normalizeText(selected);

      // Check if selected name is redundant with group name
      const isRedundant =
        Boolean(normGroup && normSelected) &&
        (normGroup === normSelected ||
          normSelected.includes(normGroup) ||
          normGroup.includes(normSelected));

      if (isRedundant) {
        return outbound.protocolStack || 'Auto';
      }

      // If group has generic auto name like "Авто-выбор VPN" or "Automatic", show selected node
      if (/авто-?выбор|auto/i.test(cleanGroup)) {
        return selected;
      }
    }

    return outbound.protocolStack || selected || 'Auto';
  }

  return outbound.description || outbound.protocolStack || outbound.type;
}
