import { normalizeOptionValues } from '../helpers/localDevices';
import { normalizeDynamicListItems } from './childItems';

export interface DeviceWidgetLike {
  getValue: () => unknown;
  setValue: (next: string[]) => void;
  [key: string]: unknown;
}

export interface DeviceOptionLike {
  onDeviceWidgetReady?: (sectionId: string, widget: DeviceWidgetLike) => void;
  onDeviceListChange?: (sectionId: string, value: unknown) => void;
  [key: string]: unknown;
}

export function stringArraysEqual(left: unknown, right: unknown): boolean {
  const normLeft = normalizeDynamicListItems(left);
  const normRight = normalizeDynamicListItems(right);

  return (
    normLeft.length === normRight.length &&
    normLeft.every((value, index) => value === normRight[index])
  );
}

export function removeMatchingValues(
  currentValues: unknown,
  valuesToRemove: unknown,
): { changed: boolean; result: string[] } {
  const selected = new Set(normalizeOptionValues(valuesToRemove));
  const current = normalizeOptionValues(currentValues);

  if (!selected.size) {
    return { changed: false, result: current };
  }

  const filtered = current.filter((item) => !selected.has(item));
  const changed = !stringArraysEqual(current, filtered);
  return { changed, result: filtered };
}

export function makeDeviceOptionsExclusive(
  ...options: DeviceOptionLike[]
): void {
  let changing = false;
  const widgets: Record<string, DeviceWidgetLike>[] = options.map(() => ({}));

  function removeMatches(
    section_id: string,
    value: unknown,
    optionIndex: number,
  ): void {
    if (changing) {
      return;
    }

    const selected = new Set(normalizeOptionValues(value));
    if (!selected.size) {
      return;
    }

    changing = true;
    try {
      widgets.forEach((optionWidgets, index) => {
        if (index === optionIndex) {
          return;
        }
        const widget = optionWidgets[section_id];
        if (!widget) {
          return;
        }
        const current = normalizeOptionValues(widget.getValue());
        const filtered = current.filter((item) => !selected.has(item));
        if (!stringArraysEqual(current, filtered)) {
          widget.setValue(filtered);
        }
      });
    } finally {
      changing = false;
    }
  }

  options.forEach((option, index) => {
    option.onDeviceWidgetReady = function (
      section_id: string,
      widget: DeviceWidgetLike,
    ) {
      widgets[index][section_id] = widget;
    };
    option.onDeviceListChange = function (section_id: string, value: unknown) {
      removeMatches(section_id, value, index);
    };
  });
}
