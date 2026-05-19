/* eslint-disable react/prop-types, react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../services/auth.services";
import { getStudentsByParent } from "../services/parent.services";
import { useSelectedStudent } from "./SelectedStudentContext";

export const PARENT_ONBOARDING_STEPS = [
  {
    id: "parent-profile",
    label: "Confirm Profile",
    title: "Confirm your profile",
    description: "Review your contact details and account information.",
    href: "/onboarding",
    phase: 1,
  },
  {
    id: "select-ward",
    label: "Select a Ward",
    title: "Select a ward",
    description: "Choose the child you want to view first.",
    href: "/onboarding",
    phase: 2,
  },
  {
    id: "view-notifications",
    label: "View Notifications",
    title: "View notifications",
    description: "Open school announcements and alerts.",
    href: "/notifications",
    phase: 3,
  },
  {
    id: "view-attendance",
    label: "Check Attendance",
    title: "Check attendance",
    description: "View your child's attendance records.",
    href: "/attendance",
    phase: 3,
  },
  {
    id: "view-timetable",
    label: "View Timetable",
    title: "View timetable",
    description: "See your child's class schedule.",
    href: "/timetable",
    phase: 3,
  },
  {
    id: "view-results",
    label: "View Results",
    title: "View results",
    description: "Check academic results and progress.",
    href: "/result",
    phase: 3,
  },
  {
    id: "request-leave",
    label: "Request Leave",
    title: "Request leave",
    description: "Submit or track leave requests.",
    href: "/requestleave",
    phase: 3,
  },
  {
    id: "open-messages",
    label: "Open Messages",
    title: "Open messages",
    description: "Communicate with teachers and school.",
    href: "/messages",
    phase: 3,
  },
];

const defaultState = {
  completedSteps: [],
  setupDismissed: false,
};

const ParentOnboardingContext = createContext(null);

const storageKey = (parentId) => `parent_onboarding_${parentId}`;

const loadState = (parentId) => {
  if (!parentId) return defaultState;
  try {
    const raw = localStorage.getItem(storageKey(parentId));
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    // Ignore malformed local state.
  }
  return defaultState;
};

const saveState = (parentId, state) => {
  if (!parentId) return;
  try {
    localStorage.setItem(storageKey(parentId), JSON.stringify(state));
  } catch {
    // Ignore storage failures.
  }
};

export const ParentOnboardingProvider = ({ children }) => {
  const { parentId, authToken, isAuthenticated } = useAuth();
  const { updateSelectedStudent } = useSelectedStudent();
  const [state, setState] = useState(defaultState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [wards, setWards] = useState([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [wardsError, setWardsError] = useState(null);
  const [wardsLoaded, setWardsLoaded] = useState(false);

  useEffect(() => {
    if (!parentId) {
      setState(defaultState);
      setIsHydrated(true);
      setWards([]);
      setWardsLoaded(false);
      return;
    }

    setIsHydrated(false);
    setState(loadState(parentId));
    setIsHydrated(true);
  }, [parentId]);

  const refreshWards = useCallback(async () => {
    if (!authToken || !parentId || !isAuthenticated) {
      setWards([]);
      setWardsLoaded(false);
      return [];
    }

    setWardsLoading(true);
    setWardsError(null);
    try {
      const data = await getStudentsByParent();
      const nextWards = Array.isArray(data) ? data : data?.students || [];
      setWards(nextWards);
      return nextWards;
    } catch (error) {
      setWardsError(error.message || "Failed to load linked wards");
      setWards([]);
      return [];
    } finally {
      setWardsLoading(false);
      setWardsLoaded(true);
    }
  }, [authToken, parentId, isAuthenticated]);

  useEffect(() => {
    refreshWards();
  }, [refreshWards]);

  const updatePersistedState = useCallback(
    (updater) => {
      setState((current) => {
        const next = updater(current);
        saveState(parentId, next);
        return next;
      });
    },
    [parentId]
  );

  const isStepComplete = useCallback(
    (stepId) => state.completedSteps.includes(stepId),
    [state.completedSteps]
  );

  const markStepComplete = useCallback(
    (stepId) => {
      updatePersistedState((current) => {
        if (current.completedSteps.includes(stepId)) return current;
        return {
          ...current,
          completedSteps: [...current.completedSteps, stepId],
          setupDismissed: false,
        };
      });
    },
    [updatePersistedState]
  );

  const unmarkStepComplete = useCallback(
    (stepId) => {
      updatePersistedState((current) => ({
        ...current,
        completedSteps: current.completedSteps.filter((id) => id !== stepId),
      }));
    },
    [updatePersistedState]
  );

  const selectDefaultWard = useCallback(
    (ward) => {
      updateSelectedStudent(ward);
      markStepComplete("select-ward");
    },
    [markStepComplete, updateSelectedStudent]
  );

  const dismissSetup = useCallback(() => {
    updatePersistedState((current) => ({ ...current, setupDismissed: true }));
  }, [updatePersistedState]);

  const completedCount = state.completedSteps.length;
  const totalCount = PARENT_ONBOARDING_STEPS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isFullyComplete = PARENT_ONBOARDING_STEPS.every((step) =>
    state.completedSteps.includes(step.id)
  );
  const hasNoLinkedWards = wardsLoaded && !wardsLoading && !wardsError && wards.length === 0;

  const value = useMemo(
    () => ({
      wards,
      wardsLoading,
      wardsLoaded,
      wardsError,
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
      progressPercent,
      isFullyComplete,
      hasNoLinkedWards,
    }),
    [
      wards,
      wardsLoading,
      wardsLoaded,
      wardsError,
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
      progressPercent,
      isFullyComplete,
      hasNoLinkedWards,
    ]
  );

  return (
    <ParentOnboardingContext.Provider value={value}>
      {children}
    </ParentOnboardingContext.Provider>
  );
};

export const useParentOnboarding = () => {
  const context = useContext(ParentOnboardingContext);
  if (!context) {
    throw new Error("useParentOnboarding must be used within ParentOnboardingProvider");
  }
  return context;
};
