export interface LuciOption {
  value: (val: string, label?: string) => void;
  depends: (field: string | Record<string, string>, value?: string) => void;
  load?: (sectionId: string) => unknown;
  cfgvalue?: (sectionId: string) => unknown;
  textvalue?: (sectionId: string) => string;
  formvalue?: (sectionId: string) => unknown;
  write?: (sectionId: string, value: unknown) => unknown;
  remove?: (sectionId: string) => unknown;
  validate?: (sectionId: string, value: unknown) => boolean | string;
  default?: string;
  rmempty?: boolean;
  modalonly?: boolean;
  editable?: boolean;
  rawhtml?: boolean;
  width?: string;
  rows?: number;
  placeholder?: string;
  datatype?: string;
  keylist?: string[];
  vallist?: string[];
  onListChange?: (sectionId: string) => void;
  renderItemSettingsModal?: (
    sectionId: string,
    value: string,
    option: LuciOption,
  ) => void;
  pendingChildSettings?: Record<
    string,
    Record<string, Record<string, unknown>>
  >;
  [key: string]: unknown;
}

export interface LuciSection {
  tab: (id: string, label: string, desc?: string) => void;
  taboption: (
    tabId: string,
    type: unknown,
    name: string,
    title?: string,
    description?: string,
  ) => LuciOption;
  option: (
    type: unknown,
    name: string,
    title?: string,
    description?: string,
  ) => LuciOption;
  handleRemove?: (...args: unknown[]) => unknown;
  load?: () => unknown;
  [key: string]: unknown;
}

export interface ChildItemSettings {
  name?: string;
  url?: string;
  user_agent?: string;
  download_via_proxy?: string;
  download_section?: string;
  protocol?: string;
  dns_type?: string;
  dns_server?: string;
  [key: string]: unknown;
}
