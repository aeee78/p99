import { beforeEach, describe, expect, it } from 'vitest';

import { P99 } from '../../../../types';
import {
  getSectionSortByLatency,
  setSectionSortByLatency,
  sortOutboundsByLatency,
} from '../sortOutboundsByLatency';

function createOutbound(name: string, latency: number): P99.Outbound {
  return {
    code: name,
    displayName: name,
    latency,
    type: 'VLESS',
    selected: false,
  };
}

describe('sortOutboundsByLatency', () => {
  it('sorts nodes by latency ascending and places unmeasured nodes at the end in original relative order', () => {
    const list: P99.Outbound[] = [
      createOutbound('node-120ms', 120),
      createOutbound('node-no-ping-1', 0),
      createOutbound('node-45ms', 45),
      createOutbound('node-500ms', 500),
      createOutbound('node-no-ping-2', 0),
      createOutbound('node-80ms', 80),
    ];

    const sorted = sortOutboundsByLatency(list);

    expect(sorted.map((item) => item.code)).toEqual([
      'node-45ms',
      'node-80ms',
      'node-120ms',
      'node-500ms',
      'node-no-ping-1',
      'node-no-ping-2',
    ]);
  });

  it('keeps nodes in order when latencies are equal', () => {
    const list: P99.Outbound[] = [
      createOutbound('a', 100),
      createOutbound('b', 100),
      createOutbound('c', 100),
    ];

    const sorted = sortOutboundsByLatency(list);
    expect(sorted.map((item) => item.code)).toEqual(['a', 'b', 'c']);
  });

  it('keeps URLTest, Priority, and pinned groups at the top even with higher or zero latency', () => {
    const list: P99.Outbound[] = [
      createOutbound('node-30ms', 30),
      {
        ...createOutbound('fastest-group', 0),
        type: 'URLTest',
        urlTestInfo: {
          code: 'fastest-group',
          displayName: 'Fastest',
          outbounds: [],
        },
      },
      createOutbound('node-10ms', 10),
      {
        ...createOutbound('priority-group', 150),
        type: 'Priority',
        pinned: true,
      },
      createOutbound('node-50ms', 50),
    ];

    const sorted = sortOutboundsByLatency(list);
    expect(sorted.map((item) => item.code)).toEqual([
      'fastest-group',
      'priority-group',
      'node-10ms',
      'node-30ms',
      'node-50ms',
    ]);
  });
});

describe('getSectionSortByLatency and setSectionSortByLatency', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const mockStorage: Storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: Object.keys(store).length,
    };
    (globalThis as unknown as { localStorage: Storage }).localStorage =
      mockStorage;
  });

  it('defaults to true when localStorage is empty', () => {
    expect(getSectionSortByLatency('test-section')).toBe(true);
  });

  it('stores and retrieves false and true', () => {
    setSectionSortByLatency('test-section', false);
    expect(getSectionSortByLatency('test-section')).toBe(false);

    setSectionSortByLatency('test-section', true);
    expect(getSectionSortByLatency('test-section')).toBe(true);
  });
});
