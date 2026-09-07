type HtmlTag = keyof HTMLElementTagNameMap;

type HtmlElement<T extends HtmlTag> = HTMLElementTagNameMap[T];

type HtmlAttributes<T extends HtmlTag = 'div'> = Partial<
  Omit<HtmlElement<T>, 'style' | 'children' | 'click'> & {
    style?: string | Partial<CSSStyleDeclaration>;
    class?: string;
    'aria-busy'?: string;
    'aria-disabled'?: string;
    'aria-label'?: string;
    'data-latency-section'?: string;
    'data-sort-section'?: string;
    [dataAttr: `data-${string}`]: unknown;
    click?: (event: MouseEvent) => void;
    onclick?: (event: MouseEvent) => void;
  }
>;

declare global {
  interface String {
    format(...args: unknown[]): string;
  }

  const fs: {
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
    remove(path: string): Promise<void>;
    exec(
      command: string,
      args?: string[],
      env?: Record<string, string>,
    ): Promise<{
      stdout: string;
      stderr: string;
      code?: number;
    }>;
  };

  const E: <T extends HtmlTag>(
    type: T,
    attr?: HtmlAttributes<T> | null,
    children?: (Node | string)[] | Node | string,
  ) => HTMLElementTagNameMap[T];

  const uci: {
    load: (packages: string | string[]) => Promise<string>;
    unload?: (packages: string | string[]) => void;
    sections: <T = unknown>(
      conf: string,
      type?: string,
      cb?: () => void,
    ) => Promise<T>;
    get: (config: string, section: string, option?: string) => unknown;
    set: (
      config: string,
      section: string,
      option: string,
      value: unknown,
    ) => void;
    unset: (config: string, section: string, option?: string) => void;
  };

  const L: {
    toArray: (val: unknown) => unknown[];
    bind: (
      fn: (...args: unknown[]) => unknown,
      context: unknown,
      ...args: unknown[]
    ) => (...callArgs: unknown[]) => unknown;
  };

  const rpc: {
    declare: (def: {
      object: string;
      method: string;
      expect?: unknown;
      params?: string[];
    }) => (...args: unknown[]) => Promise<unknown>;
  };

  const _: (_key: string) => string;

  const ui: {
    showModal: (_title: string, _content: HTMLElement) => undefined;
    hideModal: () => undefined;
    showIndicator: (id: string, text: string) => void;
    hideIndicator: (id: string) => void;
    addNotification: (
      _title: string | null,
      _children: HTMLElement | HTMLElement[] | string,
      ..._classNames: string[]
    ) => HTMLElement;
    addValidator?: (...args: unknown[]) => unknown;
    DynamicList: new (...args: unknown[]) => {
      render: () => HTMLElement;
      getValue: () => unknown[];
      setValue: (values: unknown[]) => void;
      clearChoices: () => void;
      addChoices: (keys: string[], labels: Record<string, string>) => void;
    };
  };

  type FormOptionClass = new (...args: unknown[]) => unknown;
  type FormSectionClass = new (...args: unknown[]) => unknown;

  const widgets: {
    DeviceSelect: FormOptionClass;
    NetworkSelect: FormOptionClass;
  };

  const view: {
    extend: (def: unknown) => unknown;
  };

  const baseclass: {
    extend: (def: unknown) => unknown;
  };

  const form: {
    Value: FormOptionClass;
    Flag: FormOptionClass;
    Button: FormOptionClass;
    DummyValue: FormOptionClass;
    ListValue: FormOptionClass;
    DynamicList: FormOptionClass;
    TextValue: FormOptionClass;
    NamedSection: FormSectionClass;
    GridSection: FormSectionClass;
    TypedSection: FormSectionClass;
    TableSection: FormSectionClass;
    Map: new (...args: unknown[]) => unknown;
    JSONMap: new (...args: unknown[]) => any;
  };

  const network: {
    getDevices: () => Promise<any[]>;
  };
}

export {};
