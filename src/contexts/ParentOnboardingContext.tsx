import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../services/auth.services';
import { getParentChildren } from '../services/parent.services';
import { useSelectedStudent } from './SelectedStudentContext';
import { queryKeys, staleTimes } from '../lib/queryKeys';
import { getErrorMessage } from '../lib/apiError';
import { logger } from '../lib/logger';
import type { ParentChild } from '../types/parent';

/** One step of the parent's first-run checklist. */
export interface OnboardingStep {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
  phase: 1 | 2 | 3;
}

export const PARENT_ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { id: 'parent-profile', label: 'Confirm Profile', title: 'Confirm your profile', description: 'Review your contact details and account information.', href: '/onboarding', phase: 1 },
  { id: 'select-ward', label: 'Select a Ward', title: 'Select a ward', description: 'Choose the child you want to view first.', href: '/onboarding', phase: 2 },
  { id: 'view-notifications', label: 'View Notifications', title: 'View notifications', description: 'Open school announcements and alerts.', href: '/notifications', phase: 3 },
  { id: 'view-attendance', label: 'Check Attendance', title: 'Check attendance', description: "View your child's attendance records.", href: '/attendance', phase: 3 },
  { id: 'view-timetable', label: 'View Timetable', title: 'View timetable', description: "See your child's class schedule.", href: '/timetable', phase: 3 },
  { id: 'view-results', label: 'View Results', title: 'View results', description: 'Check academic results and progress.', href: '/result', phase: 3 },
  { id: 'request-leave', label: 'Request Leave', title: 'Request leave', description: 'Submit or track leave requests.', href: '/requestleave', phase: 3 },
  { id: 'open-messages', label: 'Open Messages', title: 'Open messages', description: 'Communicate with teachers and school.', href: '/messages', phase: 3 },
] as const;

/** What the checklist remembers between visits. */
interface PersistedState {
  completedSteps: string[];
  setupDismissed: boolean;
}

/** Everything `useParentOnboarding()` exposes. */
export interface ParentOnboardingValue {
  wards: ParentChild[];
  wardsLoading: boolean;
  wardsLoaded: boolean;
  wardsError: string | null;
  refreshWards: () => Promise<ParentChild[]>;
  completedSteps: string[];
  setupDismissed: boolean;
  isHydrated: boolean;
  isStepComplete: (stepId: string) => boolean;
  markStepComplete: (stepId: string) => void;
  unmarkStepComplete: (stepId: string) => void;
  selectDefaultWard: (ward: ParentChild) => void;
  dismissSetup: () => void;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  isFullyComplete: boolean;
  /** True only once the list has loaded cleanly and come back empty. */
  hasNoLinkedWards: boolean;
}

const DEFAULT_STATE: PersistedState = { completedSteps: [], setupDismissed: false };

const ParentOnboardingContext = createContext<ParentOnboardingValue | null>(null);

/**
 * The storage key for one parent's checklist.
 *
 * @param parentId - The signed-in parent's user id.
 * @returns The localStorage key.
 */
const storageKey = (parentId: string): string => `parent_onboarding_${parentId}`;

/**
 * Reads one parent's persisted checklist.
 *
 * @param parentId - The signed-in parent's user id.
 * @returns The stored state, or the defaults.
 */
function loadState(parentId: string): PersistedState {
  if (!parentId) return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(parentId));
    if (raw) return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch (error) {
    logger.warn('onboarding', 'Stored checklist could not be parsed', error);
  }
  return DEFAULT_STATE;
}

/**
 * Persists one parent's checklist.
 *
 * @param parentId - The signed-in parent's user id.
 * @param state - The state to store.
 */
function saveState(parentId: string, state: PersistedState): void {
  if (!parentId) return;
  try {
    window.localStorage.setItem(storageKey(parentId), JSON.stringify(state));
  } catch (error) {
    logger.warn('onboarding', 'Checklist could not be saved', error);
  }
}

/**
 * Tracks the parent's first-run checklist and the children they are linked to.
 *
 * The ward list is a cached query rather than a `useEffect` fetch, so the four
 * screens that read it share one request instead of each firing their own.
 *
 * @param props - Component props.
 * @param props.children - The application tree.
 * @returns The provider element.
 */
export function ParentOnboardingProvider({ children }: { children: ReactNode }) {
  const { parentId, isAuthenticated } = useAuth();
  const { updateSelectedStudent } = useSelectedStudent();
  const queryClient = useQueryClient();

  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setState(parentId ? loadState(parentId) : DEFAULT_STATE);
    setIsHydrated(true);
  }, [parentId]);

  const wardsQuery = useQuery({
    queryKey: queryKeys.children.list(parentId || 'anon'),
    queryFn: getParentChildren,
    enabled: Boolean(parentId && isAuthenticated),
    staleTime: staleTimes.list,
  });

  const refreshWards = useCallback(async (): Promise<ParentChild[]> => {
    if (!parentId || !isAuthenticated) return [];
    const result = await queryClient.fetchQuery({
      queryKey: queryKeys.children.list(parentId),
      queryFn: getParentChildren,
    });
    return result;
  }, [parentId, isAuthenticated, queryClient]);

  const updatePersistedState = useCallback(
    (updater: (current: PersistedState) => PersistedState) => {
      setState((current) => {
        const next = updater(current);
        saveState(parentId, next);
        return next;
      });
    },
    [parentId],
  );

  const isStepComplete = useCallback(
    (stepId: string) => state.completedSteps.includes(stepId),
    [state.completedSteps],
  );

  const markStepComplete = useCallback(
    (stepId: string) => {
      updatePersistedState((current) =>
        current.completedSteps.includes(stepId)
          ? current
          : { ...current, completedSteps: [...current.completedSteps, stepId], setupDismissed: false },
      );
    },
    [updatePersistedState],
  );

  const unmarkStepComplete = useCallback(
    (stepId: string) => {
      updatePersistedState((current) => ({
        ...current,
        completedSteps: current.completedSteps.filter((id) => id !== stepId),
      }));
    },
    [updatePersistedState],
  );

  const selectDefaultWard = useCallback(
    (ward: ParentChild) => {
      updateSelectedStudent(ward);
      markStepComplete('select-ward');
    },
    [markStepComplete, updateSelectedStudent],
  );

  const dismissSetup = useCallback(() => {
    updatePersistedState((current) => ({ ...current, setupDismissed: true }));
  }, [updatePersistedState]);

  const wards = wardsQuery.data ?? [];
  const completedCount = state.completedSteps.length;
  const totalCount = PARENT_ONBOARDING_STEPS.length;

  const value = useMemo<ParentOnboardingValue>(() => {
    const wardsLoaded = !wardsQuery.isPending && wardsQuery.fetchStatus !== 'fetching';
    return {
      wards,
      wardsLoading: wardsQuery.isPending,
      wardsLoaded,
      wardsError: wardsQuery.error ? getErrorMessage(wardsQuery.error, 'Could not load your children.') : null,
      refreshWards,
      completedSteps: state.completedSteps,
      setupDismissed: state.setupDismissed,
      isHydrated,
      isStepComplete,
      markStepComplete,
      unmarkStepComplete,
      selectDefaultWard,
      dismissSetup,
      completedCount,
      totalCount,
      progressPercent: Math.round((completedCount / totalCount) * 100),
      isFullyComplete: PARENT_ONBOARDING_STEPS.every((step) => state.completedSteps.includes(step.id)),
      // Only after a clean load: a failed request must never be read as
      // "this parent has no children" and bounce them into onboarding.
      hasNoLinkedWards: wardsLoaded && !wardsQuery.isError && wards.length === 0,
    };
  }, [
    wards,
    wardsQuery.isPending,
    wardsQuery.fetchStatus,
    wardsQuery.isError,
    wardsQuery.error,
    refreshWards,
    state.completedSteps,
    state.setupDismissed,
    isHydrated,
    isStepComplete,
    markStepComplete,
    unmarkStepComplete,
    selectDefaultWard,
    dismissSetup,
    completedCount,
    totalCount,
  ]);

  return (
    <ParentOnboardingContext.Provider value={value}>{children}</ParentOnboardingContext.Provider>
  );
}

/**
 * The parent's checklist state and their linked children.
 *
 * @returns The onboarding context.
 * @throws When called outside `ParentOnboardingProvider`.
 */
export function useParentOnboarding(): ParentOnboardingValue {
  const context = useContext(ParentOnboardingContext);
  if (!context) {
    throw new Error('useParentOnboarding must be used within ParentOnboardingProvider');
  }
  return context;
}
