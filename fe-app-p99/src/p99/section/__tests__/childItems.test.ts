import { describe, it, expect } from 'vitest';
import {
  normalizeDynamicListItems,
  uniqueDynamicListItems,
  childOwnerOption,
  childItemOrder,
  compactItemSettings,
  cleanFormSectionData,
} from '../childItems';

describe('section child items helpers', () => {
  it('normalizes dynamic list items from array or space-separated string', () => {
    expect(normalizeDynamicListItems([' a ', 'b', ''])).toEqual(['a', 'b']);
    expect(normalizeDynamicListItems('one   two \t three')).toEqual([
      'one',
      'two',
      'three',
    ]);
    expect(normalizeDynamicListItems(null)).toEqual([]);
  });

  it('deduplicates items via uniqueDynamicListItems', () => {
    expect(uniqueDynamicListItems(['a', 'b', 'a', 'c', 'b'])).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('resolves child owner option default to section', () => {
    expect(childOwnerOption()).toBe('section');
    expect(childOwnerOption('group')).toBe('group');
  });

  it('extracts numeric order from child item', () => {
    expect(childItemOrder({ order: '5' })).toBe(5);
    expect(childItemOrder({ order: 12 })).toBe(12);
    expect(childItemOrder({ order: 'invalid' })).toBe(0);
    expect(childItemOrder(null)).toBe(0);
  });

  it('compacts item settings object omitting empty or null entries', () => {
    const raw = {
      name: 'test',
      empty: '',
      nullVal: null,
      undefVal: undefined,
      tags: ['tag1', ' ', 'tag2'],
      emptyTags: ['', ' '],
    };
    expect(compactItemSettings(raw)).toEqual({
      name: 'test',
      tags: ['tag1', 'tag2'],
    });
  });

  it('cleans internal form section data (omitting dot-prefixed properties)', () => {
    const raw = {
      '.name': 'cfg1234',
      '.type': 'section',
      label: 'My Section',
      enabled: '1',
      emptyField: '',
    };
    expect(cleanFormSectionData(raw)).toEqual({
      label: 'My Section',
      enabled: '1',
    });
  });
});
