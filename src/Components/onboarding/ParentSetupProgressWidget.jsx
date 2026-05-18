import { ArrowRight, CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PARENT_ONBOARDING_STEPS,
  useParentOnboarding,
} from "../../contexts/ParentOnboardingContext";

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

  return (
    <section className="rounded-lg border border-[#E8EDF3] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FB] text-[#003366]">
            {isFullyComplete ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#030E18]">
              {isFullyComplete ? "Parent setup complete" : "Complete Your Setup"}
            </h2>
            <p className="mt-1 text-xs text-[#657386]">
              {isFullyComplete
                ? "You’ve completed all required parent setup actions."
                : "Complete the steps below to unlock the full experience."}
            </p>
          </div>
        </div>
        {isFullyComplete && (
          <button
            onClick={dismissSetup}
            className="rounded-md p-1 text-[#8A98A8] hover:bg-[#F4F6F8]"
            aria-label="Dismiss setup widget"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs font-semibold">
        <span className="text-[#657386]">{completedCount} / {totalCount} Completed</span>
        <span className="text-[#003366]">{progressPercent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E9EEF4]">
        <div className="h-full rounded-full bg-green-500" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="mt-5 space-y-2">
        {(isFullyComplete ? PARENT_ONBOARDING_STEPS.slice(-3) : remainingSteps).map((step) => (
          <div key={step.id} className="flex items-center gap-2 text-sm">
            {isStepComplete(step.id) ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-[#A7B1BE]" />
            )}
            <span className={isStepComplete(step.id) ? "text-green-700" : "text-[#4D5B6A]"}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {!isFullyComplete && (
        <button
          onClick={() => navigate("/onboarding")}
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#E6EAF0] bg-white text-sm font-semibold text-[#003366] hover:bg-[#F7F9FB]"
        >
          Continue Setup
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
