import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('joins class names and drops falsy ones', () => {
    const hidden = false as boolean;
    expect(cn('a', hidden && 'b', undefined, 'c', { d: true, e: false })).toBe('a c d');
  });

  it('lets the last conflicting Tailwind class win', () => {
    expect(cn('p-2 text-sm', 'p-4')).toBe('text-sm p-4');
  });
});
