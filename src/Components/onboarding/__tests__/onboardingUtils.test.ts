import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../../types/auth';
import type { ParentChild } from '../../../types/parent';
import { getAvatarUrl, getInitials, getPersonName, getStudentClassLabel } from '../onboardingUtils';
import { findGuideConfig, guideConfigs } from '../parentGuideSteps';
import { getCardPosition, getCompletedKey, getSeenKey } from '../guideUtils';

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
  const child: ParentChild = {
    childId: 'c1',
    className: 'JSS 1A',
    grade: 'JSS 1',
    userId: { _id: 'u9', firstName: 'Tunde', lastName: 'Okafor', userAvatar: 'https://img/t.png' },
  };

  it('reads the name and photo from the nested user when the top level has none', () => {
    expect(getPersonName(child)).toBe('Tunde Okafor');
    expect(getInitials(child)).toBe('TO');
    expect(getAvatarUrl(child)).toBe('https://img/t.png');
  });

  it('prefers the top-level avatar', () => {
    expect(getAvatarUrl({ ...child, avatar: 'https://img/top.png' })).toBe('https://img/top.png');
  });

  it('labels the class with its grade when there is one', () => {
    expect(getStudentClassLabel(child)).toBe('JSS 1 • JSS 1A');
    expect(getStudentClassLabel({ className: 'JSS 1A' })).toBe('JSS 1A');
    expect(getStudentClassLabel({})).toBe('Class not assigned');
  });
});

describe('the guide config', () => {
  it('matches exact pages only when asked to', () => {
    expect(findGuideConfig('/settings')?.id).toBe('settings');
    expect(findGuideConfig('/settings/extra')).toBeUndefined();
    expect(findGuideConfig('/dashboard')).toBeUndefined();
  });

  it('keeps the four settings targets the Settings page carries, and no two-factor copy', () => {
    const settings = guideConfigs.find((c) => c.id === 'settings');
    expect(settings?.steps.map((s) => s.target)).toEqual([
      'settings-header',
      'settings-profile',
      'settings-children',
      'settings-security',
      'settings-preferences',
    ]);
    const security = settings?.steps.find((s) => s.target === 'settings-security');
    expect(security?.description).toBe('Update your password and phone number from this section.');
  });

  it('has unique tour ids and at least one step each', () => {
    const ids = guideConfigs.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    guideConfigs.forEach((c) => expect(c.steps.length).toBeGreaterThan(0));
  });
});

describe('guide storage keys and card placement', () => {
  it('scopes the flags by parent and tour', () => {
    expect(getSeenKey('settings', 'p1')).toBe('talim_parent_guide:p1:settings:seen');
    expect(getCompletedKey('settings', 'p1')).toBe('talim_parent_guide:p1:settings:completed');
  });

  it('centres the card when the target is missing', () => {
    expect(getCardPosition(null)).toMatchObject({ top: '50%', left: '50%', arrow: 'hidden' });
  });

  it('places the card below a target on a phone-width screen, inside the viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    const pos = getCardPosition({ top: 100, left: 20, width: 335, height: 60 });
    expect(pos.arrow).toBe('top');
    expect(pos.top).toBe('180px');
    expect(parseFloat(pos.left)).toBeGreaterThanOrEqual(16);
    expect(parseFloat(pos.left) + Math.min(400, 375 - 32)).toBeLessThanOrEqual(375 - 16);
  });
});
