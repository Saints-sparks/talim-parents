import { ArrowRight, CheckCircle2, Circle, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PARENT_ONBOARDING_STEPS, useParentOnboarding } from '../../contexts/ParentOnboardingContext';
import SetupProgressBar from './SetupProgressBar';

/**
 * The dashboard card that nudges a parent through the rest of their setup, and
 * lets them dismiss it once everything is done.
 *
 * @returns The card, or nothing before hydration or after it is dismissed.
 */
export default function ParentSetupProgressWidget() {
  const navigate = useNavigate();
  const {
    completedCount,
    totalCount,
    progressPercent,
    isStepComplete,
    isFullyComplete,
    setupDismissed,
    dismissSetup,
    isHydrated,
  } = useParentOnboarding();

  if (!isHydrated) return null;
  if (isFullyComplete && setupDismissed) return null;

  const remainingSteps = PARENT_ONBOARDING_STEPS.filter((step) => !isStepComplete(step.id)).slice(0, 5);
  const listedSteps = isFullyComplete ? PARENT_ONBOARDING_STEPS.slice(-3) : remainingSteps;

  return (
    <section className="rounded-lg border border-[#E8EDF3] bg-white p-5 shadow-sm dark:border-[#2a3a5a] dark:bg-[#1a2540]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FB] text-[#003366] dark:bg-[#1e2d47] dark:text-blue-300">
            {isFullyComplete ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#030E18] dark:text-slate-100">
              {isFullyComplete ? 'Parent setup complete' : 'Complete Your Setup'}
            </h2>
            <p className="mt-1 text-xs text-[#657386] dark:text-slate-300">
              {isFullyComplete
                ? 'You’ve completed all required parent setup actions.'
                : 'Complete the steps below to unlock the full experience.'}
            </p>
          </div>
        </div>
        {isFullyComplete && (
          <button
            type="button"
            onClick={dismissSetup}
            className="rounded-md p-1 text-[#8A98A8] hover:bg-[#F4F6F8] dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Dismiss setup widget"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs font-semibold">
        <span className="text-[#657386] dark:text-slate-300">
          {completedCount} / {totalCount} Completed
        </span>
        <span className="text-[#003366] dark:text-blue-300">{progressPercent}%</span>
      </div>
      <SetupProgressBar percent={progressPercent} />

      <div className="mt-5 space-y-2">
        {listedSteps.map((step) => (
          <div key={step.id} className="flex items-center gap-2 text-sm">
            {isStepComplete(step.id) ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-[#A7B1BE] dark:text-slate-500" />
            )}
            <span
              className={
                isStepComplete(step.id) ? 'text-green-700 dark:text-green-400' : 'text-[#4D5B6A] dark:text-slate-300'
              }
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {!isFullyComplete && (
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#E6EAF0] bg-white text-sm font-semibold text-[#003366] hover:bg-[#F7F9FB] dark:border-[#2a3a5a] dark:bg-transparent dark:text-blue-300 dark:hover:bg-slate-800"
        >
          Continue Setup
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
