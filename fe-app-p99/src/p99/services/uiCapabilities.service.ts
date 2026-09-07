import { P99_ACTION_PROVIDERS_AVAILABILITY_EVENT } from '../../constants';
import { P99ShellMethods } from '../methods/shell';
import { store } from './store.service';
import { applyUiStateToStore } from './uiState.service';
import type { UiCapabilities } from '../tabs/settings/types';

export interface UiCapabilitiesState extends UiCapabilities {
  reset: () => void;
}

const defaultCapabilities: UiCapabilities = {
  loaded: false,
  singBoxExtended: false,
  singBoxTiny: false,
  singBoxTailscale: true,
  zapretInstalled: false,
  zapret2Installed: false,
  byedpiInstalled: false,
  serverInboundsEnabledCount: 0,
};

let uiCapabilities: UiCapabilities = { ...defaultCapabilities };
let uiCapabilitiesPromise: Promise<UiCapabilities> | null = null;

export function getUiCapabilities(): UiCapabilities {
  return uiCapabilities;
}

export function resetUiCapabilities(): void {
  uiCapabilities = { ...defaultCapabilities };
  uiCapabilitiesPromise = null;
}

export function applyUiCapabilities(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(P99_ACTION_PROVIDERS_AVAILABILITY_EVENT, {
        detail: {
          zapretInstalled: uiCapabilities.zapretInstalled,
          zapret2Installed: uiCapabilities.zapret2Installed,
          byedpiInstalled: uiCapabilities.byedpiInstalled,
        },
      }),
    );
  }

  if (store && typeof store.set === 'function') {
    const currentSystemInfo = store.get().diagnosticsSystemInfo;
    store.set({
      diagnosticsSystemInfo: {
        ...currentSystemInfo,
        providerInfoLoaded: true,
        sing_box_extended: uiCapabilities.singBoxExtended ? 1 : 0,
        sing_box_tiny: uiCapabilities.singBoxTiny ? 1 : 0,
        sing_box_tailscale: uiCapabilities.singBoxTailscale ? 1 : 0,
        zapret_installed: uiCapabilities.zapretInstalled ? 1 : 0,
        zapret2_installed: uiCapabilities.zapret2Installed ? 1 : 0,
        byedpi_installed: uiCapabilities.byedpiInstalled ? 1 : 0,
        server_inbounds_enabled_count:
          uiCapabilities.serverInboundsEnabledCount,
        zapret_version: uiCapabilities.zapretInstalled
          ? currentSystemInfo.zapret_version
          : 'not installed',
        zapret2_version: uiCapabilities.zapret2Installed
          ? currentSystemInfo.zapret2_version
          : 'not installed',
        byedpi_version: uiCapabilities.byedpiInstalled
          ? currentSystemInfo.byedpi_version
          : 'not installed',
      },
    });
  }
}

export function updateUiCapabilities(
  data?: Record<string, unknown> | null,
): UiCapabilities {
  uiCapabilities.loaded = true;
  uiCapabilities.singBoxExtended = Boolean(
    Number(data?.sing_box_extended) === 1,
  );
  uiCapabilities.singBoxTiny = Boolean(Number(data?.sing_box_tiny) === 1);
  uiCapabilities.singBoxTailscale =
    typeof data?.sing_box_tailscale === 'undefined'
      ? true
      : Boolean(Number(data.sing_box_tailscale) === 1);
  uiCapabilities.zapretInstalled = Boolean(
    Number(data?.zapret_installed) === 1,
  );
  uiCapabilities.zapret2Installed = Boolean(
    Number(data?.zapret2_installed) === 1,
  );
  uiCapabilities.byedpiInstalled = Boolean(
    Number(data?.byedpi_installed) === 1,
  );
  uiCapabilities.serverInboundsEnabledCount = 0;

  applyUiCapabilities();

  return uiCapabilities;
}

export function applyUiState(
  data?: {
    capabilities?: Record<string, unknown>;
    service?: {
      sing_box?: { running?: unknown };
      p99?: { running?: unknown; enabled?: unknown; status?: unknown };
    };
    [key: string]: unknown;
  } | null,
): UiCapabilities {
  const capData = (data?.capabilities || data || {}) as Record<string, unknown>;
  const result = updateUiCapabilities(capData);

  if (typeof applyUiStateToStore === 'function' && data?.service) {
    applyUiStateToStore(
      data as unknown as Parameters<typeof applyUiStateToStore>[0],
    );
  } else if (store && typeof store.set === 'function' && data?.service) {
    store.set({
      servicesInfoWidget: {
        loading: false,
        failed: false,
        data: {
          singbox: Number(data.service.sing_box?.running) || 0,
          p99Running: Number(data.service.p99?.running) || 0,
          p99Enabled: Number(data.service.p99?.enabled) || 0,
          p99Status: (data.service.p99?.status as string) || '',
        },
      },
    });
  }

  return result;
}

export function loadFallbackUiCapabilities(): Promise<UiCapabilities> {
  return Promise.allSettled([
    P99ShellMethods.checkZapretRuntime(),
    P99ShellMethods.checkZapret2Runtime(),
    P99ShellMethods.checkByedpiRuntime(),
  ]).then(
    ([zapretRuntimeResult, zapret2RuntimeResult, byedpiRuntimeResult]) => {
      const zapretRuntime =
        zapretRuntimeResult.status === 'fulfilled'
          ? zapretRuntimeResult.value
          : null;
      const zapret2Runtime =
        zapret2RuntimeResult.status === 'fulfilled'
          ? zapret2RuntimeResult.value
          : null;
      const byedpiRuntime =
        byedpiRuntimeResult.status === 'fulfilled'
          ? byedpiRuntimeResult.value
          : null;

      return updateUiCapabilities({
        zapret_installed:
          zapretRuntime?.success &&
          Number(zapretRuntime.data?.zapret_installed) === 1
            ? 1
            : 0,
        zapret2_installed:
          zapret2Runtime?.success &&
          Number(zapret2Runtime.data?.zapret2_installed) === 1
            ? 1
            : 0,
        byedpi_installed:
          byedpiRuntime?.success &&
          Number(byedpiRuntime.data?.byedpi_installed) === 1
            ? 1
            : 0,
        server_inbounds_enabled_count: 0,
      });
    },
  );
}

export function loadUiCapabilities(): Promise<UiCapabilities> {
  if (uiCapabilities.loaded) {
    return Promise.resolve(uiCapabilities);
  }

  if (uiCapabilitiesPromise) {
    return uiCapabilitiesPromise;
  }

  uiCapabilitiesPromise = P99ShellMethods.getUiCapabilities()
    .then((response) => {
      if (!response?.success) {
        throw new Error('UI capabilities request failed');
      }

      return updateUiCapabilities(
        response.data as unknown as Record<string, unknown>,
      );
    })
    .catch((error) => {
      console.warn('Failed to load P99 UI capabilities', error);
      return P99ShellMethods.getUiState()
        .then((response) => {
          if (!response?.success) {
            throw new Error('UI state request failed');
          }

          return applyUiState(
            response.data as unknown as Parameters<typeof applyUiState>[0],
          );
        })
        .catch((fallbackError) => {
          console.warn('Failed to load P99 UI state', fallbackError);
          return loadFallbackUiCapabilities();
        });
    })
    .finally(() => {
      uiCapabilitiesPromise = null;
    });

  return uiCapabilitiesPromise;
}

export const uiCapabilitiesService = {
  getCapabilities: getUiCapabilities,
  loadUiCapabilities,
  updateUiCapabilities,
  applyUiCapabilities,
  applyUiState,
  loadFallbackUiCapabilities,
  reset: resetUiCapabilities,
};
