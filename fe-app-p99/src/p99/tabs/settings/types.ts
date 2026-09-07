export interface UiCapabilities {
  loaded: boolean;
  singBoxExtended: boolean;
  singBoxTiny: boolean;
  singBoxTailscale: boolean;
  zapretInstalled: boolean;
  zapret2Installed: boolean;
  byedpiInstalled: boolean;
  serverInboundsEnabledCount: number;
}

export interface LuciOption {
  option?: string;
  default?: unknown;
  rmempty?: boolean;
  readonly?: boolean;
  optional?: boolean;
  datatype?: string;
  placeholder?: string;
  multiple?: boolean;
  noaliases?: boolean;
  nobridges?: boolean;
  noinactive?: boolean;
  keylist?: string[];
  vallist?: string[];
  map?: {
    readonly?: boolean;
    data?: {
      state?: {
        values?: Record<string, Record<string, Record<string, unknown>>>;
      };
    };
  };
  value: (key: string, label?: string) => void;
  depends: (field: string, val: string) => void;
  retain?: boolean;
  checkDepends?: (section_id: string) => boolean;
  filter?: (section_id: string, value: string) => boolean;
  cfgvalue?: (section_id: string) => unknown;
  formvalue?: (section_id: string) => unknown;
  load?: (section_id: string) => unknown;
  write?: (section_id: string, value: unknown) => void;
  remove?: (section_id: string) => void;
  validate?: (section_id: string, value: unknown) => boolean | string;
  cbid?: (section_id: string) => string;
  devices?: Array<{
    getName: () => string;
    getType: () => string;
  }>;
  onDeviceWidgetReady?: (section_id: string, widget: unknown) => void;
  onDeviceListChange?: (section_id: string, value: unknown) => void;
}

export interface LuciSection {
  anonymous?: boolean;
  addremove?: boolean;
  sortable?: boolean;
  rowcolors?: boolean;
  nodescriptions?: boolean;
  description?: HTMLElement | string;
  uciconfig?: string;
  map?: {
    config?: string;
  };
  option: (
    type: FormOptionClass,
    name: string,
    title?: string,
    description?: string,
  ) => LuciOption;
  cfgsections?: () => string[];
  modaltitle?: (section_id: string) => string;
  sectiontitle?: (section_id: string) => string;
  renderSectionAdd?: (extra_class?: string) => HTMLElement;
  renderRowActions?: (section_id: string) => HTMLElement;
  formvalue?: (sectionId: string, optionName?: string) => string;
}
