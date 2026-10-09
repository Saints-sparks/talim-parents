import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../services/auth.services', () => ({ useAuth: () => ({ parentId: 'p1', isAuthenticated: true }) }));
vi.mock('../SelectedStudentContext', () => ({ useSelectedStudent: () => ({ selectChild: vi.fn() }) }));
vi.mock('../../hooks/useActiveChild', () => ({
  useChildrenQuery: () => ({ data: [], isPending: false, fetchStatus: 'idle', isError: false, error: null }),
}));

import { ParentOnboardingProvider, useParentOnboarding } from '../ParentOnboardingContext';

/** Marks a step on mount, as OnboardingRouteTracker does for a visited page. */
function VisitPage({ step, seen }: { step: string; seen: (complete: boolean) => void }) {
  const { markStepComplete, isStepComplete, isHydrated } = useParentOnboarding();
  useEffect(() => markStepComplete(step), [markStepComplete, step]);
  useEffect(() => {
    if (isHydrated) seen(isStepComplete('parent-profile') && isStepComplete('select-ward'));
  });
  return null;
}

describe('ParentOnboardingProvider', () => {
  it('keeps the stored progress when a page marks a step before the checklist is read (a fresh load of /attendance)', async () => {
    localStorage.setItem('parent_onboarding_p1', JSON.stringify({ completedSteps: ['parent-profile', 'select-ward'], setupDismissed: true }));
    const seen = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ParentOnboardingProvider>
          <VisitPage step="view-attendance" seen={seen} />
        </ParentOnboardingProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(seen).toHaveBeenLastCalledWith(true));
    const stored = JSON.parse(localStorage.getItem('parent_onboarding_p1')!) as { completedSteps: string[] };
    expect(stored.completedSteps).toEqual(expect.arrayContaining(['parent-profile', 'select-ward', 'view-attendance']));
  });
});
