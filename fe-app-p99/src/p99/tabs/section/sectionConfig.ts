import { cleanupRemovedChildItems } from './childItemsManager';
import type { LuciSection } from './types';

export function loadSectionTableOptions(
  sectionRef: LuciSection,
): Promise<unknown> {
  const sectionIds =
    typeof sectionRef.cfgsections === 'function'
      ? (sectionRef.cfgsections() as string[])
      : [];
  const children = Array.isArray(sectionRef.children)
    ? (sectionRef.children as {
        disable?: boolean;
        modalonly?: boolean;
        load?: (id: string) => unknown;
        cfgvalue?: (id: string, val: unknown) => void;
      }[])
    : [];
  const tasks: Promise<unknown>[] = [];

  for (let i = 0; i < sectionIds.length; i += 1) {
    const sectionId = sectionIds[i];

    for (let j = 0; j < children.length; j += 1) {
      const option = children[j];

      if (
        option.disable ||
        option.modalonly ||
        typeof option.load !== 'function'
      ) {
        continue;
      }

      tasks.push(
        Promise.resolve(option.load.call(option, sectionId)).then((value) => {
          if (typeof option.cfgvalue === 'function') {
            option.cfgvalue(sectionId, value);
          }
        }),
      );
    }
  }

  return Promise.all(tasks);
}

export function configureSectionSection(
  sectionRef: LuciSection,
  options: {
    loadActionProvidersAvailability?: () => Promise<unknown>;
    setActionProvidersAvailabilityLoader?: (loader: unknown) => void;
  } = {},
): void {
  if (typeof options.setActionProvidersAvailabilityLoader === 'function') {
    options.setActionProvidersAvailabilityLoader(
      options.loadActionProvidersAvailability,
    );
  }

  const handleRemove = sectionRef.handleRemove;
  sectionRef.handleRemove = function (this: unknown, ...args: unknown[]) {
    const section_id = `${args[0] || ''}`;
    cleanupRemovedChildItems(section_id, 'subscription_url', []);
    cleanupRemovedChildItems(section_id, 'section_interface', []);
    cleanupRemovedChildItems(section_id, 'urltest', []);
    cleanupRemovedChildItems(section_id, 'priority_group', []);
    return handleRemove ? handleRemove.apply(this, args) : undefined;
  };

  sectionRef.load = function () {
    return loadSectionTableOptions(this);
  };
}
