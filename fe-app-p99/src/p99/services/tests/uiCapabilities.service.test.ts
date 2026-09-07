import { beforeEach, describe, expect, it, vi } from 'vitest';
import { P99ShellMethods } from '../../methods/shell';
import { store } from '../store.service';
import {
  applyUiState,
  getUiCapabilities,
  loadFallbackUiCapabilities,
  loadUiCapabilities,
  resetUiCapabilities,
  updateUiCapabilities,
} from '../uiCapabilities.service';

describe('uiCapabilities.service', () => {
  beforeEach(() => {
    resetUiCapabilities();
    vi.restoreAllMocks();
    if (typeof window === 'undefined') {
      Object.assign(globalThis, {
        window: {
          dispatchEvent: vi.fn(() => true),
        },
        CustomEvent: class CustomEvent<T = unknown> {
          type: string;
          detail: T;
          constructor(type: string, options?: { detail?: T }) {
            this.type = type;
            this.detail = options?.detail as T;
          }
        },
      });
    }
  });

  it('starts with default unloaded state', () => {
    const caps = getUiCapabilities();
    expect(caps.loaded).toBe(false);
    expect(caps.singBoxTailscale).toBe(true);
    expect(caps.zapretInstalled).toBe(false);
  });

  it('updates capabilities from numeric flags', () => {
    const caps = updateUiCapabilities({
      sing_box_extended: 1,
      sing_box_tiny: 0,
      sing_box_tailscale: 0,
      zapret_installed: 1,
      zapret2_installed: 0,
      byedpi_installed: 1,
    });

    expect(caps.loaded).toBe(true);
    expect(caps.singBoxExtended).toBe(true);
    expect(caps.singBoxTiny).toBe(false);
    expect(caps.singBoxTailscale).toBe(false);
    expect(caps.zapretInstalled).toBe(true);
    expect(caps.zapret2Installed).toBe(false);
    expect(caps.byedpiInstalled).toBe(true);
  });

  it('dispatches window event and updates store on applyUiCapabilities', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const storeSpy = vi.spyOn(store, 'set');

    updateUiCapabilities({
      zapret_installed: 1,
      zapret2_installed: 1,
      byedpi_installed: 0,
    });

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('p99:action-providers-availability');
    expect(event.detail).toEqual({
      zapretInstalled: true,
      zapret2Installed: true,
      byedpiInstalled: false,
    });

    expect(storeSpy).toHaveBeenCalled();
  });

  it('applyUiState updates service info in store', () => {
    const storeSpy = vi.spyOn(store, 'set');

    applyUiState({
      capabilities: {
        sing_box_extended: 1,
      },
      service: {
        sing_box: { running: 1 },
        p99: { running: 1, enabled: 1, status: 'running' },
      },
    });

    expect(storeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        servicesInfoWidget: expect.objectContaining({
          data: {
            singbox: 1,
            p99Running: 1,
            p99Enabled: 1,
            p99Status: 'running',
          },
        }),
      }),
    );
  });

  it('loadFallbackUiCapabilities queries shell check methods', async () => {
    vi.spyOn(P99ShellMethods, 'checkZapretRuntime').mockResolvedValue({
      success: true,
      data: { zapret_installed: 1 },
    } as unknown as Awaited<
      ReturnType<typeof P99ShellMethods.checkZapretRuntime>
    >);

    vi.spyOn(P99ShellMethods, 'checkZapret2Runtime').mockResolvedValue({
      success: true,
      data: { zapret2_installed: 0 },
    } as unknown as Awaited<
      ReturnType<typeof P99ShellMethods.checkZapret2Runtime>
    >);

    vi.spyOn(P99ShellMethods, 'checkByedpiRuntime').mockResolvedValue({
      success: true,
      data: { byedpi_installed: 1 },
    } as unknown as Awaited<
      ReturnType<typeof P99ShellMethods.checkByedpiRuntime>
    >);

    const result = await loadFallbackUiCapabilities();
    expect(result.zapretInstalled).toBe(true);
    expect(result.zapret2Installed).toBe(false);
    expect(result.byedpiInstalled).toBe(true);
  });

  it('loadUiCapabilities fetches capabilities and caches the result', async () => {
    const getCapsSpy = vi
      .spyOn(P99ShellMethods, 'getUiCapabilities')
      .mockResolvedValue({
        success: true,
        data: {
          zapret_installed: 1,
        },
      } as unknown as Awaited<
        ReturnType<typeof P99ShellMethods.getUiCapabilities>
      >);

    const caps1 = await loadUiCapabilities();
    expect(caps1.zapretInstalled).toBe(true);
    expect(getCapsSpy).toHaveBeenCalledTimes(1);

    const caps2 = await loadUiCapabilities();
    expect(caps2).toBe(caps1);
    expect(getCapsSpy).toHaveBeenCalledTimes(1);
  });
});
