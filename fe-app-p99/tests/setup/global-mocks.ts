// tests/setup/global-mocks.ts
(globalThis as any)._ = (key: string) => key;

class MockBaseClass {
  static extend(proto: Record<string, any>) {
    const Sub = class extends MockBaseClass {};
    Object.assign(Sub.prototype, proto);
    (Sub as any).extend = (childProto: Record<string, any>) => {
      const Child = class extends Sub {};
      Object.assign(Child.prototype, childProto);
      return Child;
    };
    return Sub;
  }
}

if (typeof (globalThis as any).baseclass === 'undefined') {
  (globalThis as any).baseclass = MockBaseClass;
}

if (typeof (globalThis as any).ui === 'undefined') {
  (globalThis as any).ui = {
    DynamicList: MockBaseClass.extend({}),
    addValidator: () => {},
  };
}

if (typeof (globalThis as any).form === 'undefined') {
  (globalThis as any).form = {
    Flag: MockBaseClass.extend({}),
    Value: MockBaseClass.extend({}),
    ListValue: MockBaseClass.extend({}),
    DynamicList: MockBaseClass.extend({}),
    TextValue: MockBaseClass.extend({}),
    DummyValue: MockBaseClass.extend({}),
    TypedSection: MockBaseClass.extend({}),
    GridSection: MockBaseClass.extend({}),
    TableSection: MockBaseClass.extend({}),
    Map: MockBaseClass.extend({}),
  };
}

if (typeof (globalThis as any).uci === 'undefined') {
  (globalThis as any).uci = {
    get: () => undefined,
    set: () => {},
    unset: () => {},
    sections: () => [],
    load: () => Promise.resolve(''),
  };
}
