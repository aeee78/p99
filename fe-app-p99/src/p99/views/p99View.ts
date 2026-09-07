import { P99_UCI_PACKAGE } from '../../constants';
import { injectGlobalStyles } from '../../helpers/injectGlobalStyles';
import { P99ShellMethods } from '../methods/shell';
import { coreService } from '../services/core.service';
import { store } from '../services/store.service';
import {
  loadUiCapabilities,
  getUiCapabilities,
} from '../services/uiCapabilities.service';
import { applyUiStateToStore } from '../services/uiState.service';
import { DashboardTab } from '../tabs/dashboard';
import { DiagnosticTab } from '../tabs/diagnostic';
import { MonitoringTab } from '../tabs/monitoring';
import { createSettingsContent } from '../tabs/settings';
import {
  configureSubscriptionsSection as defaultConfigureSubscriptionsSection,
  createSubscriptionsContent as defaultCreateSubscriptionsContent,
} from '../tabs/subscriptions';
import { UpdatesTab } from '../tabs/updates';
import type { LuciSection, UiCapabilities } from '../tabs/settings/types';

export interface P99ViewDependencies {
  dashboard?: { createDashboardContent: (section: LuciSection) => void };
  section?: {
    configureSectionSection: (
      section: LuciSection,
      options: {
        loadActionProvidersAvailability: () => Promise<UiCapabilities>;
      },
    ) => void;
    createSectionContent: (section: LuciSection) => void;
  };
  subscriptions?: {
    configureSubscriptionsSection: (section: LuciSection) => void;
    createSubscriptionsContent: (section: LuciSection) => void;
  };
  settings?: {
    createSettingsContent: (
      section: LuciSection,
      capabilities?: UiCapabilities,
    ) => void;
  };
  diagnostic?: { createDiagnosticContent: (section: LuciSection) => void };
  monitoring?: { createMonitoringContent: (section: LuciSection) => void };
  updates?: { createUpdatesContent: (section: LuciSection) => void };
}

export function renderSectionAdd(
  sectionRef: LuciSection,
  extra_class?: string,
): HTMLElement {
  const gridProto = form.GridSection?.prototype as {
    renderSectionAdd?: (this: unknown, extra_class?: string) => HTMLElement;
  };
  const el = gridProto?.renderSectionAdd
    ? gridProto.renderSectionAdd.call(sectionRef, extra_class)
    : typeof document !== 'undefined'
      ? document.createElement('div')
      : ({} as HTMLElement);

  const nameEl = el.querySelector?.('.cbi-section-create-name');

  if (ui.addValidator && nameEl) {
    ui.addValidator(
      nameEl,
      'uciname',
      true,
      (value: string) => {
        const button = el.querySelector(
          '.cbi-section-create > .cbi-button-add',
        ) as HTMLButtonElement | null;
        const uciconfig = sectionRef.uciconfig || sectionRef.map?.config;

        if (!value) {
          if (button) button.disabled = true;
          return true;
        }

        if (uciconfig && uci.get(uciconfig, value)) {
          if (button) button.disabled = true;
          return _('Expecting: %s').replace('%s', _('unique UCI identifier'));
        }

        if (button) button.disabled = false;
        return true;
      },
      'blur',
      'keyup',
    );
  }

  return el;
}

export function getRuleEditButtonText(): string {
  const label = _('Edit rule action');
  return label === 'Edit rule action' ? 'Edit' : label;
}

export function configureGridSection(
  sectionRef: LuciSection,
  type: string,
  title: string,
  addTitle: string,
): void {
  sectionRef.anonymous = false;
  sectionRef.addremove = true;
  sectionRef.sortable = true;
  sectionRef.rowcolors = true;
  sectionRef.nodescriptions = true;
  sectionRef.modaltitle = function (section_id: string): string {
    const label = uci.get(P99_UCI_PACKAGE, section_id, 'label') as string;
    return section_id ? `${title}: ${label || section_id}` : addTitle;
  };
  sectionRef.sectiontitle = function (section_id: string): string {
    return (
      (uci.get(P99_UCI_PACKAGE, section_id, 'label') as string) || section_id
    );
  };
  sectionRef.renderSectionAdd = function (extra_class?: string): HTMLElement {
    return renderSectionAdd(sectionRef, extra_class);
  };

  if (type === 'section') {
    sectionRef.renderRowActions = function (
      this: unknown,
      section_id: string,
    ): HTMLElement {
      const tableProto = form.TableSection?.prototype as {
        renderRowActions?: (
          this: unknown,
          section_id: string,
          btnText: string,
        ) => HTMLElement;
      };
      return tableProto?.renderRowActions
        ? tableProto.renderRowActions.call(
            this,
            section_id,
            getRuleEditButtonText(),
          )
        : typeof document !== 'undefined'
          ? document.createElement('div')
          : ({} as HTMLElement);
    };
  }
}

export async function renderP99View(
  deps: P99ViewDependencies = {},
): Promise<HTMLElement> {
  injectGlobalStyles();

  const MapClass = form.Map as new (
    pkg: string,
    title: string,
    desc: null,
  ) => {
    tabbed: boolean;
    section: (
      type: FormSectionClass,
      name: string,
      title?: string,
      description?: string,
    ) => LuciSection;
    handleSaveApply?: (
      this: unknown,
      ev: Event,
      mode: unknown,
    ) => Promise<unknown>;
    render: () => Promise<HTMLElement>;
  };

  const p99Map = new MapClass(P99_UCI_PACKAGE, _('P99 X Settings'), null);
  p99Map.tabbed = true;

  const originalHandleSaveApply = p99Map.handleSaveApply;
  p99Map.handleSaveApply = function (
    ev: Event,
    mode: unknown,
  ): Promise<unknown> {
    const refreshUiState = function () {
      P99ShellMethods.getUiState()
        .then((response) => {
          if (response?.success && typeof applyUiStateToStore === 'function') {
            applyUiStateToStore(
              response.data as unknown as Parameters<
                typeof applyUiStateToStore
              >[0],
            );
          }
        })
        .catch(() => null);
    };

    if (store && typeof store.set === 'function') {
      const servicesInfoWidget = store.get().servicesInfoWidget;
      store.set({
        servicesInfoWidget: {
          ...servicesInfoWidget,
          data: {
            ...servicesInfoWidget.data,
            p99Status: 'reloading',
          },
        },
      });
    }

    const applyPromise = originalHandleSaveApply
      ? originalHandleSaveApply.call(this, ev, mode)
      : Promise.resolve();

    return Promise.resolve(applyPromise)
      .then((result) => {
        if (typeof window !== 'undefined') {
          window.setTimeout(refreshUiState, 250);
        }
        return result;
      })
      .catch((error) => {
        refreshUiState();
        throw error;
      });
  };

  const TypedSec = form.TypedSection;
  const GridSec = form.GridSection;

  function mountTab(
    section: LuciSection,
    renderFn: () => HTMLElement,
    initFn?: () => void | Promise<void>,
  ): void {
    const dummyClass =
      typeof form !== 'undefined' && form.DummyValue
        ? form.DummyValue
        : (class {} as FormOptionClass);
    const o = section.option(dummyClass, '_mount_node') as unknown as {
      rawhtml: boolean;
      cfgvalue: () => unknown;
    };
    o.rawhtml = true;
    o.cfgvalue = () => {
      initFn?.();
      return renderFn();
    };
  }

  // 1. Dashboard Tab
  const dashboardSection = p99Map.section(
    TypedSec,
    'dashboard',
    _('Dashboard'),
  );
  dashboardSection.anonymous = true;
  dashboardSection.addremove = false;
  dashboardSection.cfgsections = function () {
    return ['dashboard'];
  };
  const dashboardCreator =
    deps.dashboard?.createDashboardContent ||
    ((sec: LuciSection) =>
      mountTab(
        sec,
        () => DashboardTab.render(),
        () => DashboardTab.initController(),
      ));
  dashboardCreator(dashboardSection);

  // 2. Sections Tab (Rules)
  const rulesSection = p99Map.section(
    GridSec,
    'section',
    _('Sections'),
    _('Drag rows to change priority. The rule at the top is checked first.'),
  );
  configureGridSection(
    rulesSection,
    'section',
    _('Section'),
    _('Add a section'),
  );
  if (deps.section?.configureSectionSection) {
    deps.section.configureSectionSection(rulesSection, {
      loadActionProvidersAvailability: loadUiCapabilities,
    });
  }
  if (deps.section?.createSectionContent) {
    deps.section.createSectionContent(rulesSection);
  }

  // 3. Subscriptions Tab
  const subscriptionsSection = p99Map.section(
    GridSec,
    'subscription',
    _('Subscriptions'),
    _(
      'Manage remote subscriptions. Configure subscriptions once and select them in any section.',
    ),
  );
  configureGridSection(
    subscriptionsSection,
    'subscription',
    _('Subscription'),
    _('Add a subscription'),
  );
  if (deps.subscriptions?.configureSubscriptionsSection) {
    deps.subscriptions.configureSubscriptionsSection(subscriptionsSection);
  } else {
    defaultConfigureSubscriptionsSection(subscriptionsSection);
  }

  if (deps.subscriptions?.createSubscriptionsContent) {
    deps.subscriptions.createSubscriptionsContent(subscriptionsSection);
  } else {
    defaultCreateSubscriptionsContent(
      subscriptionsSection as unknown as Parameters<
        typeof defaultCreateSubscriptionsContent
      >[0],
    );
  }

  // 4. Settings Tab
  const settingsSection = p99Map.section(TypedSec, 'settings', _('Settings'));
  settingsSection.anonymous = true;
  settingsSection.addremove = false;
  settingsSection.cfgsections = function () {
    return ['settings'];
  };
  const settingsCreator =
    deps.settings?.createSettingsContent || createSettingsContent;
  settingsCreator(settingsSection, getUiCapabilities());

  // 5. Diagnostics Tab
  const diagnosticSection = p99Map.section(
    TypedSec,
    'diagnostic',
    _('Diagnostics'),
  );
  diagnosticSection.anonymous = true;
  diagnosticSection.addremove = false;
  diagnosticSection.cfgsections = function () {
    return ['diagnostic'];
  };
  const diagCreator =
    deps.diagnostic?.createDiagnosticContent ||
    ((sec: LuciSection) =>
      mountTab(
        sec,
        () => DiagnosticTab.render(),
        () => DiagnosticTab.initController(),
      ));
  diagCreator(diagnosticSection);

  // 6. Monitoring Tab
  const monitoringSection = p99Map.section(
    TypedSec,
    'monitoring',
    _('Monitoring'),
  );
  monitoringSection.anonymous = true;
  monitoringSection.addremove = false;
  monitoringSection.cfgsections = function () {
    return ['monitoring'];
  };
  const monCreator =
    deps.monitoring?.createMonitoringContent ||
    ((sec: LuciSection) =>
      mountTab(
        sec,
        () => MonitoringTab.render(),
        () => MonitoringTab.initController(),
      ));
  monCreator(monitoringSection);

  // 7. Updates (Components) Tab
  const updatesSection = p99Map.section(TypedSec, 'updates', _('Components'));
  updatesSection.anonymous = true;
  updatesSection.addremove = false;
  updatesSection.cfgsections = function () {
    return ['updates'];
  };
  const updatesCreator =
    deps.updates?.createUpdatesContent ||
    ((sec: LuciSection) =>
      mountTab(
        sec,
        () => UpdatesTab.render(),
        () => UpdatesTab.initController(),
      ));
  updatesCreator(updatesSection);

  await loadUiCapabilities().catch(() => null);

  const rendered = await p99Map.render();
  coreService({
    waitForLogWatcherStart: loadUiCapabilities,
    logWatcherStartDelayMs: 5000,
  });

  return rendered;
}
