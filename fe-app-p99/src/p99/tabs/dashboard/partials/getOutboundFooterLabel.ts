import { P99 } from '../../../types';

export function getOutboundFooterLabel(outbound: P99.Outbound) {
  return (
    outbound.urlTestInfo?.selectedName ||
    outbound.priorityInfo?.selectedName ||
    outbound.description ||
    outbound.type
  );
}
