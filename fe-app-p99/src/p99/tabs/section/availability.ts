import { P99_ACTION_PROVIDERS_AVAILABILITY_EVENT } from '../../../constants';
import { P99ShellMethods } from '../../methods/shell';

export interface ActionProvidersAvailabilityState {
  loaded: boolean;
  zapretInstalled: boolean;
  zapret2Installed: boolean;
  byedpiInstalled: boolean;
}

export const actionProvidersAvailabilityState: ActionProvidersAvailabilityState =
  {
    loaded: false,
    zapretInstalled: false,
    zapret2Installed: false,
    byedpiInstalled: false,
  };

let actionProvidersAvailabilityPromise: Promise<ActionProvidersAvailabilityState> | null =
  null;
let actionProvidersAvailabilityLoader:
  | (() => Promise<Partial<ActionProvidersAvailabilityState>>)
  | null = null;

export function updateActionProvidersAvailabilityState(
  nextState?: Partial<ActionProvidersAvailabilityState> | null,
): void {
  if (!nextState) {
    return;
  }

  actionProvidersAvailabilityState.loaded = true;

  if (typeof nextState.zapretInstalled !== 'undefined') {
    actionProvidersAvailabilityState.zapretInstalled = Boolean(
      nextState.zapretInstalled,
    );
  }

  if (typeof nextState.zapret2Installed !== 'undefined') {
    actionProvidersAvailabilityState.zapret2Installed = Boolean(
      nextState.zapret2Installed,
    );
  }

  if (typeof nextState.byedpiInstalled !== 'undefined') {
    actionProvidersAvailabilityState.byedpiInstalled = Boolean(
      nextState.byedpiInstalled,
    );
  }

  actionProvidersAvailabilityPromise = null;
}

export function updateActionProvidersAvailabilityFromSystemInfo(
  systemInfo?: {
    providerInfoLoaded?: boolean;
    zapret_installed?: boolean;
    zapret2_installed?: boolean;
    byedpi_installed?: boolean;
  } | null,
): void {
  if (!systemInfo || !systemInfo.providerInfoLoaded) {
    return;
  }

  updateActionProvidersAvailabilityState({
    zapretInstalled: Boolean(systemInfo.zapret_installed),
    zapret2Installed: Boolean(systemInfo.zapret2_installed),
    byedpiInstalled: Boolean(systemInfo.byedpi_installed),
  });
}

export function setActionProvidersAvailabilityLoader(
  loader?: (() => Promise<Partial<ActionProvidersAvailabilityState>>) | null,
): void {
  actionProvidersAvailabilityLoader =
    typeof loader === 'function' ? loader : null;
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    P99_ACTION_PROVIDERS_AVAILABILITY_EVENT,
    (event: any) => {
      updateActionProvidersAvailabilityState(event.detail);
    },
  );
}

export function ensureActionProvidersAvailabilityLoaded(): Promise<ActionProvidersAvailabilityState> {
  if (actionProvidersAvailabilityState.loaded) {
    return Promise.resolve(actionProvidersAvailabilityState);
  }

  if (actionProvidersAvailabilityPromise) {
    return actionProvidersAvailabilityPromise;
  }

  if (actionProvidersAvailabilityLoader) {
    actionProvidersAvailabilityPromise = actionProvidersAvailabilityLoader()
      .then((capabilities) => {
        updateActionProvidersAvailabilityState({
          zapretInstalled: Boolean(capabilities?.zapretInstalled),
          zapret2Installed: Boolean(capabilities?.zapret2Installed),
          byedpiInstalled: Boolean(capabilities?.byedpiInstalled),
        });
        return actionProvidersAvailabilityState;
      })
      .catch(() => {
        actionProvidersAvailabilityLoader = null;
        actionProvidersAvailabilityPromise = null;
        return ensureActionProvidersAvailabilityLoaded();
      })
      .finally(() => {
        actionProvidersAvailabilityPromise = null;
      });

    return actionProvidersAvailabilityPromise;
  }

  actionProvidersAvailabilityPromise = Promise.allSettled([
    P99ShellMethods.checkZapretRuntime(),
    P99ShellMethods.checkZapret2Runtime(),
    P99ShellMethods.checkByedpiRuntime(),
  ])
    .then(([zapretResult, zapret2Result, byedpiResult]) => {
      const zapret =
        zapretResult && zapretResult.status === 'fulfilled'
          ? (zapretResult.value as any)
          : null;
      const zapret2 =
        zapret2Result && zapret2Result.status === 'fulfilled'
          ? (zapret2Result.value as any)
          : null;
      const byedpi =
        byedpiResult && byedpiResult.status === 'fulfilled'
          ? (byedpiResult.value as any)
          : null;

      actionProvidersAvailabilityState.loaded = true;
      actionProvidersAvailabilityState.zapretInstalled = Boolean(
        zapret && zapret.success && zapret.data && zapret.data.zapret_installed,
      );
      actionProvidersAvailabilityState.zapret2Installed = Boolean(
        zapret2 &&
          zapret2.success &&
          zapret2.data &&
          zapret2.data.zapret2_installed,
      );
      actionProvidersAvailabilityState.byedpiInstalled = Boolean(
        byedpi && byedpi.success && byedpi.data && byedpi.data.byedpi_installed,
      );
      return actionProvidersAvailabilityState;
    })
    .catch(() => {
      actionProvidersAvailabilityState.loaded = true;
      actionProvidersAvailabilityState.zapretInstalled = false;
      actionProvidersAvailabilityState.zapret2Installed = false;
      actionProvidersAvailabilityState.byedpiInstalled = false;
      return actionProvidersAvailabilityState;
    })
    .finally(() => {
      actionProvidersAvailabilityPromise = null;
    });

  return actionProvidersAvailabilityPromise;
}

export function isZapretInstalledForUi(): boolean {
  return actionProvidersAvailabilityState.zapretInstalled;
}

export function isZapret2InstalledForUi(): boolean {
  return actionProvidersAvailabilityState.zapret2Installed;
}

export function isByedpiInstalledForUi(): boolean {
  return actionProvidersAvailabilityState.byedpiInstalled;
}
