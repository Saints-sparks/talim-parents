import { describe, expect, it } from 'vitest';
import { groupBySchool, resolveActiveChild } from '../useActiveChild';
import { parseStoredChildId } from '../../contexts/selectedChildStorage';
import type { ChildSummary } from '../../types/portal/children';

/**
 * A linked child, overridable per test.
 *
 * @param id - The child's id.
 * @param overrides - Fields to change.
 * @returns The child.
 */
function kid(id: string, overrides: Partial<ChildSummary> = {}): ChildSummary {
  return {
    id,
    name: `Child ${id}`,
    admissionNumber: null,
    class: { id: `k-${id}`, name: 'JSS 1' },
    school: { id: 'sparks', name: 'Easy Sparks' },
    attendanceRate: null,
    average: null,
    grade: null,
    position: null,
    outstanding: 0,
    isDefault: false,
    ...overrides,
  };
}

const AMARA = kid('aaa');
const BOLA = kid('bbb', { isDefault: true });

describe('resolveActiveChild', () => {
  it('has no child when none are linked', () => {
    expect(resolveActiveChild([], 'aaa')).toBeNull();
  });

  it('keeps the remembered child when the server still links them', () => {
    expect(resolveActiveChild([AMARA, BOLA], 'aaa')).toBe(AMARA);
  });

  it('never returns a child that is not in the linked list', () => {
    expect(resolveActiveChild([AMARA, BOLA], 'ccc')).toBe(BOLA);
  });

  it('falls back to the default child, then the first', () => {
    expect(resolveActiveChild([AMARA, BOLA], null)).toBe(BOLA);
    expect(resolveActiveChild([AMARA, kid('ccc')], null)).toBe(AMARA);
  });
});

describe('groupBySchool', () => {
  it('groups children by school, keeping the order schools and children first appear', () => {
    const bright = { id: 'bright', name: 'Brightgate' };
    const groups = groupBySchool([AMARA, kid('z', { school: bright }), BOLA, kid('y', { school: bright })]);
    expect(groups.map((group) => group.school.name)).toEqual(['Easy Sparks', 'Brightgate']);
    expect(groups[0].children.map((child) => child.id)).toEqual(['aaa', 'bbb']);
    expect(groups[1].children.map((child) => child.id)).toEqual(['z', 'y']);
  });
});

describe('parseStoredChildId', () => {
  it('reads the bare id the app now stores', () => {
    expect(parseStoredChildId('aaa')).toBe('aaa');
  });

  it('reads the id out of the whole child older builds stored', () => {
    expect(parseStoredChildId('{"childId":"aaa","firstName":"Amara"}')).toBe('aaa');
    expect(parseStoredChildId('{"_id":"bbb"}')).toBe('bbb');
  });

  it('forgets an unreadable value', () => {
    expect(parseStoredChildId('{not json')).toBeNull();
    expect(parseStoredChildId(null)).toBeNull();
  });
});
