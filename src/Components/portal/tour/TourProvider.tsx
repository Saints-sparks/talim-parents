import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../services/auth.services';
import { useParentOnboarding } from '../../../contexts/ParentOnboardingContext';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { logger } from '../../../lib/logger';
import { Sheet, SheetRow } from '../ui/Dialog';
import { ghostButton, primaryButton, rowButton } from '../ui/styles';
import { tourSteps } from './tourSteps';

/** What {@link useTour} exposes. */
export interface TourValue {
  /** Opens the tour at its first step (Settings › Help › Getting started). */
  openTour: () => void;
}

const TourContext = createContext<TourValue>({ openTour: () => {} });

/**
 * The key that remembers one parent has seen the tour.
 *
 * @param parentId - The signed-in parent.
 * @returns The localStorage key.
 */
const tourSeenKey = (parentId: string): string => `talim_tour_seen_${parentId}`;

/** Pages where the tour never opens on its own. */
const QUIET_PATHS = new Set(['/', '/onboarding', '/forgot-password', '/set-password']);

/**
 * The design's "Getting started" tour sheet: six steps, each with a "Go"
 * row that opens that part of the portal, Back and Next. It opens on its own
 * once per parent, the first time they reach the portal after onboarding (the
 * existing first-run flow), and can be replayed from Settings › Help.
 *
 * @param props - Component props.
 * @param props.children - The app.
 * @returns The provider and the sheet.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { parentId, isAuthenticated } = useAuth();
  const { isHydrated, isStepComplete } = useParentOnboarding();
  const { children: kids, groups } = useActiveChild();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = useMemo(() => tourSteps(kids.length, groups.length), [kids.length, groups.length]);
  const onboarded = isHydrated && isStepComplete('parent-profile') && isStepComplete('select-ward');

  const markSeen = useCallback(() => {
    if (!parentId) return;
    try {
      window.localStorage.setItem(tourSeenKey(parentId), '1');
    } catch (error) {
      logger.warn('tour', 'Could not remember the tour', error);
    }
  }, [parentId]);

  useEffect(() => {
    if (!isAuthenticated || !parentId || !onboarded || QUIET_PATHS.has(location.pathname)) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(tourSeenKey(parentId)) === '1';
    } catch {
      seen = true;
    }
    if (!seen) {
      setStep(0);
      setOpen(true);
      markSeen();
    }
  }, [isAuthenticated, parentId, onboarded, location.pathname, markSeen]);

  const openTour = useCallback(() => {
    setStep(0);
    setOpen(true);
    markSeen();
  }, [markSeen]);

  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openTour }), [openTour]);
  const current = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;

  return (
    <TourContext.Provider value={value}>
      {children}
      <Sheet
        open={open}
        onClose={close}
        eyebrowText="Getting started"
        title={current.title}
        footer={
          <>
            {step > 0 ? (
              <button type="button" className={ghostButton} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Back
              </button>
            ) : null}
            <button type="button" className={`${primaryButton} flex-1`} onClick={last ? close : () => setStep((s) => s + 1)}>
              {last ? 'Finish' : 'Next'}
            </button>
          </>
        }
      >
        <p className="text-[13px] font-bold text-tl-faint" aria-live="polite">
          Step {step + 1} of {steps.length}
        </p>
        <p className="text-sm leading-[1.7] text-tl-body">{current.body}</p>
        <SheetRow
          label={current.goLabel}
          description="Take me there now"
          action={
            <button
              type="button"
              className={rowButton}
              onClick={() => {
                close();
                navigate(current.path);
              }}
            >
              Go
            </button>
          }
        />
      </Sheet>
    </TourContext.Provider>
  );
}

/**
 * Opens the tour from anywhere (Settings › Help).
 *
 * @returns The tour controls.
 */
export function useTour(): TourValue {
  return useContext(TourContext);
}
