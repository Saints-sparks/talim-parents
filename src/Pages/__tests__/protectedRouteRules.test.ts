import { describe, expect, it } from 'vitest';
import { decideProtectedRoute, type ProtectedRouteState } from '../protectedRouteRules';

const ready: ProtectedRouteState = {
  pathname: '/dashboard',
  authToken: 'token',
  loading: false,
  isHydrated: true,
  hasNoLinkedWards: false,
  profileConfirmed: true,
  wardSelected: true,
};

describe('decideProtectedRoute', () => {
  it('waits while the session is loading', () => {
    expect(decideProtectedRoute({ ...ready, loading: true })).toBe('loading');
  });

  it('waits until the checklist has been read from storage', () => {
    expect(decideProtectedRoute({ ...ready, isHydrated: false })).toBe('loading');
  });

  it('loads before it redirects, even with no token', () => {
    expect(decideProtectedRoute({ ...ready, authToken: null, loading: true })).toBe('loading');
  });

  it('sends a visitor with no token to sign-in', () => {
    expect(decideProtectedRoute({ ...ready, authToken: null })).toBe('login');
  });

  it('sends no-token visitors to sign-in even on the onboarding route', () => {
    expect(decideProtectedRoute({ ...ready, authToken: null, pathname: '/onboarding' })).toBe('login');
  });

  it('lets a fully onboarded parent through', () => {
    expect(decideProtectedRoute(ready)).toBe('allow');
  });

  it('holds a parent who has not confirmed their profile on onboarding', () => {
    expect(decideProtectedRoute({ ...ready, profileConfirmed: false })).toBe('onboarding');
  });

  it('holds a parent who has not chosen a child on onboarding', () => {
    expect(decideProtectedRoute({ ...ready, wardSelected: false })).toBe('onboarding');
  });

  it('holds a parent with no linked children on onboarding, even when the steps are done', () => {
    expect(decideProtectedRoute({ ...ready, hasNoLinkedWards: true })).toBe('onboarding');
  });

  it('never redirects /onboarding to itself', () => {
    const incomplete = { ...ready, profileConfirmed: false, wardSelected: false, hasNoLinkedWards: true };
    expect(decideProtectedRoute({ ...incomplete, pathname: '/onboarding' })).toBe('allow');
  });

  it('keeps /settings reachable before onboarding is finished, so a child can be linked with a code', () => {
    const incomplete = { ...ready, profileConfirmed: false, wardSelected: false, hasNoLinkedWards: true };
    expect(decideProtectedRoute({ ...incomplete, pathname: '/settings' })).toBe('allow');
  });

  it('only exempts those two routes exactly, not their sub-paths', () => {
    const incomplete = { ...ready, profileConfirmed: false };
    expect(decideProtectedRoute({ ...incomplete, pathname: '/settings/123' })).toBe('onboarding');
    expect(decideProtectedRoute({ ...incomplete, pathname: '/onboarding/x' })).toBe('onboarding');
  });

  it('sends an account on its temporary password to /set-password before anything else', () => {
    expect(decideProtectedRoute({ ...ready, mustChangePassword: true })).toBe('set-password');
    expect(decideProtectedRoute({ ...ready, profileConfirmed: false, mustChangePassword: true })).toBe('set-password');
  });
});
