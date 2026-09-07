import { describe, expect, it } from 'vitest';
import {
  makeDeviceOptionsExclusive,
  removeMatchingValues,
  stringArraysEqual,
  type DeviceOptionLike,
  type DeviceWidgetLike,
} from '../clientIsolation';

function createMockDeviceOption(initialValues: string[]): DeviceOptionLike & {
  widget: DeviceWidgetLike;
} {
  const widget: DeviceWidgetLike = {
    values: initialValues,
    getValue() {
      return this.values;
    },
    setValue(next: string[]) {
      this.values = next;
    },
  };

  return {
    widget,
  };
}

describe('clientIsolation helper module', () => {
  it('correctly compares string arrays after normalization', () => {
    expect(stringArraysEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(stringArraysEqual(['a ', 'b'], ['a', 'b'])).toBe(true);
    expect(stringArraysEqual(['a'], ['a', 'b'])).toBe(false);
    expect(stringArraysEqual([], null)).toBe(true);
  });

  it('removes matching values without mutating original when unchanged', () => {
    const res1 = removeMatchingValues(['192.168.1.1/32'], ['192.168.1.2/32']);
    expect(res1.changed).toBe(false);
    expect(res1.result).toEqual(['192.168.1.1/32']);

    const res2 = removeMatchingValues(
      ['192.168.1.1/32', '192.168.1.2/32'],
      ['192.168.1.1/32'],
    );
    expect(res2.changed).toBe(true);
    expect(res2.result).toEqual(['192.168.1.2/32']);
  });

  it('enforces mutual exclusivity between filtered and forced routing device widgets', () => {
    const filtered = createMockDeviceOption(['192.0.2.1/32']);
    const forced = createMockDeviceOption(['192.0.2.1/32', '192.0.2.2/32']);

    makeDeviceOptionsExclusive(filtered, forced);
    filtered.onDeviceWidgetReady?.('section', filtered.widget);
    forced.onDeviceWidgetReady?.('section', forced.widget);

    // Filtered changes: removes 192.0.2.1/32 from forced
    filtered.onDeviceListChange?.('section', filtered.widget.getValue());
    expect(forced.widget.getValue()).toEqual(['192.0.2.2/32']);

    // Forced changes: adding 192.0.2.1/32 back into forced removes it from filtered
    forced.widget.setValue(['192.0.2.1/32', '192.0.2.2/32']);
    forced.onDeviceListChange?.('section', forced.widget.getValue());
    expect(filtered.widget.getValue()).toEqual([]);
  });

  it('does nothing when value is empty or widget is unmounted', () => {
    const opt1 = createMockDeviceOption(['192.0.2.1/32']);
    const opt2 = createMockDeviceOption(['192.0.2.2/32']);

    makeDeviceOptionsExclusive(opt1, opt2);
    // onDeviceWidgetReady not called for section
    expect(() => {
      opt1.onDeviceListChange?.('section', []);
      opt1.onDeviceListChange?.('section', ['192.0.2.2/32']);
    }).not.toThrow();
  });
});
