import { P99 } from '../../../types';

function getStorage(): Storage | undefined {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (
    typeof globalThis !== 'undefined' &&
    'localStorage' in globalThis &&
    (globalThis as unknown as { localStorage?: Storage }).localStorage
  ) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return undefined;
}

export function getSectionSortByLatency(sectionKey: string): boolean {
  const storage = getStorage();
  if (!storage) {
    return true;
  }
  try {
    const item = storage.getItem(`p99_sort_latency_${sectionKey}`);
    if (item === null) {
      return true;
    }
    return item === '1' || item === 'true';
  } catch {
    return true;
  }
}

export function setSectionSortByLatency(
  sectionKey: string,
  enabled: boolean,
): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(`p99_sort_latency_${sectionKey}`, enabled ? '1' : '0');
  } catch {
    // Ignore quota or security errors in local storage
  }
}

export function sortOutboundsByLatency(
  outbounds: P99.Outbound[],
): P99.Outbound[] {
  return [...outbounds].sort((a, b) => {
    const latA =
      typeof a.latency === 'number' && a.latency > 0 ? a.latency : Infinity;
    const latB =
      typeof b.latency === 'number' && b.latency > 0 ? b.latency : Infinity;

    if (latA === latB) {
      return 0;
    }
    return latA - latB;
  });
}
