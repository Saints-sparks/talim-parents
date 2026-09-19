import { afterEach, describe, it, expect, vi } from 'vitest';
import { logger } from '../logger';
import { getSchoolIdFromLocalStorage } from '../localStorageUtils';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('getSchoolIdFromLocalStorage', () => {
  it('reads the school id off the stored user', () => {
    localStorage.setItem('user', JSON.stringify({ user: { schoolId: 's-1' } }));
    expect(getSchoolIdFromLocalStorage()).toBe('s-1');
  });

  it('is null when nothing is stored or the entry has no school', () => {
    expect(getSchoolIdFromLocalStorage()).toBeNull();
    localStorage.setItem('user', JSON.stringify({ user: {} }));
    expect(getSchoolIdFromLocalStorage()).toBeNull();
  });

  it('is null (not a crash) when the entry is not JSON', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    localStorage.setItem('user', '{oops');
    expect(getSchoolIdFromLocalStorage()).toBeNull();
    expect(warn).toHaveBeenCalledWith('storage', expect.any(String), expect.any(SyntaxError));
  });
});
