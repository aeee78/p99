import { describe, expect, it } from 'vitest';

import { P99 } from '../../../../types';
import { getOutboundFooterLabel } from '../getOutboundFooterLabel';

function outbound(options: Partial<P99.Outbound>): P99.Outbound {
  return {
    code: 'proxy',
    displayName: 'proxy',
    latency: 0,
    type: 'VLESS',
    selected: false,
    ...options,
  };
}

describe('getOutboundFooterLabel', () => {
  it('shows the active URLTest member instead of the group type', () => {
    expect(
      getOutboundFooterLabel(
        outbound({
          urlTestInfo: {
            code: 'auto',
            displayName: 'Automatic',
            selectedName: 'edge-7.nl.cdn-store.cloud',
            outbounds: [],
          },
        }),
      ),
    ).toBe('edge-7.nl.cdn-store.cloud');
  });

  it('shows the active Priority member instead of the group type', () => {
    expect(
      getOutboundFooterLabel(
        outbound({
          type: 'Priority',
          priorityInfo: {
            code: 'priority',
            displayName: 'Priority',
            selectedName: 'Latvia primary',
            outbounds: [],
          },
        }),
      ),
    ).toBe('Latvia primary');
  });

  it('shows Server Description for a regular host and falls back to protocol', () => {
    expect(
      getOutboundFooterLabel(outbound({ description: 'Upstream Tube' })),
    ).toBe('Upstream Tube');
    expect(getOutboundFooterLabel(outbound({}))).toBe('VLESS');
  });

  it('avoids tautology when active member name matches group name', () => {
    expect(
      getOutboundFooterLabel(
        outbound({
          displayName: 'enot 🇫🇮 Финляндия',
          cleanDisplayName: '🇫🇮 Финляндия',
          protocolStack: 'Auto · VLESS · Reality',
          urlTestInfo: {
            code: 'urltest-fi',
            displayName: 'enot 🇫🇮 Финляндия',
            selectedName: 'enot 🇫🇮 Финляндия',
            outbounds: [],
          },
        }),
      ),
    ).toBe('Auto · VLESS · Reality');
  });

  it('shows technical protocol stack for regular nodes', () => {
    expect(
      getOutboundFooterLabel(
        outbound({
          type: 'VLESS',
          protocolStack: 'VLESS · Reality',
        }),
      ),
    ).toBe('VLESS · Reality');

    expect(
      getOutboundFooterLabel(
        outbound({
          type: 'Hysteria2',
          protocolStack: 'Hysteria2',
        }),
      ),
    ).toBe('Hysteria2');
  });
});
