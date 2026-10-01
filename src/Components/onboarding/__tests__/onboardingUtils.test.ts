import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../../types/auth';
import type { ChildSummary } from '../../../types/portal/children';
import { getAvatarUrl, getInitials, getPersonName, getStudentClassLabel } from '../onboardingUtils';

describe('the signed-in parent', () => {
  // The auth user's `userId` is a plain string, not a nested document.
  const parent: AuthUser = { userId: 'u1', firstName: 'Amina', lastName: 'Bello', userAvatar: 'https://img/a.png' };

  it('gets real initials, not the "P" fallback', () => {
    expect(getInitials(parent)).toBe('AB');
  });

  it('gets a name and photo', () => {
    expect(getPersonName(parent)).toBe('Amina Bello');
    expect(getAvatarUrl(parent)).toBe('https://img/a.png');
  });

  it('falls back when the record has no name', () => {
    expect(getPersonName({})).toBe('Not set');
    expect(getPersonName(null)).toBe('Not set');
    expect(getInitials(null)).toBe('P');
  });
});

describe('a child', () => {
  const child: ChildSummary = {
    id: 'c1',
    name: 'Tunde Okafor',
    admissionNumber: 'TAL/1',
    class: { id: 'k1', name: 'JSS 1A' },
    school: { id: 's1', name: 'Easy Sparks', city: 'Ikeja' },
    attendanceRate: 95,
    average: 70,
    grade: 'B',
    position: null,
    outstanding: 0,
    isDefault: true,
  };

  it('labels the class with the school, for families across schools', () => {
    expect(getStudentClassLabel(child)).toBe('JSS 1A · Easy Sparks');
  });

  it('says when the school has not placed the child in a class', () => {
    expect(getStudentClassLabel({ ...child, class: null })).toBe('Class not assigned · Easy Sparks');
    expect(getStudentClassLabel(null)).toBe('Class not assigned');
  });
});
