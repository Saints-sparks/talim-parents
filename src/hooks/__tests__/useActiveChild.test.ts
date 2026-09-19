import { describe, expect, it } from 'vitest';
import { resolveActiveChild } from '../useActiveChild';
import type { ParentChild } from '../../types/parent';

const AMARA: ParentChild = { childId: 'aaa', firstName: 'Amara', className: 'JSS 1' };
const BOLA: ParentChild = { childId: 'bbb', firstName: 'Bola', isDefault: true };
const CHIDI: ParentChild = { childId: 'ccc', firstName: 'Chidi' };

describe('resolveActiveChild', () => {
  it('has no child when none are linked', () => {
    expect(resolveActiveChild([], AMARA)).toBeNull();
  });

  it('keeps the remembered child when the server still links them', () => {
    expect(resolveActiveChild([AMARA, BOLA], AMARA)).toBe(AMARA);
  });

  it('uses the server copy of the child, not the stale remembered one', () => {
    const stale = { childId: 'aaa', firstName: 'Amara', className: 'Old class' };
    expect(resolveActiveChild([AMARA, BOLA], stale)?.className).toBe('JSS 1');
  });

  it('never returns a child that is not in the linked list', () => {
    expect(resolveActiveChild([AMARA, BOLA], CHIDI)).toBe(BOLA);
  });

  it('falls back to the default child, then the first', () => {
    expect(resolveActiveChild([AMARA, BOLA], null)).toBe(BOLA);
    expect(resolveActiveChild([AMARA, CHIDI], null)).toBe(AMARA);
  });

  it('matches by record id when the remembered child came from an older shape', () => {
    expect(resolveActiveChild([AMARA, BOLA], { _id: 'aaa' })).toBe(AMARA);
  });
});
