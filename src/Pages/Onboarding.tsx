import { Loader2 } from 'lucide-react';
import NoLinkedWardState from '../Components/onboarding/NoLinkedWardState';
import ParentProfileConfirmStep from '../Components/onboarding/ParentProfileConfirmStep';
import ParentSetupChecklist from '../Components/onboarding/ParentSetupChecklist';
import WardSelectionStep from '../Components/onboarding/WardSelectionStep';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';

/**
 * The first-run flow: confirm profile, pick a child, then the setup checklist.
 * Which one shows follows from what the parent has already completed.
 *
 * @returns The current onboarding screen.
 */
export default function Onboarding() {
  const { wardsLoading, isHydrated, hasNoLinkedWards, isStepComplete } = useParentOnboarding();

  if (!isHydrated || wardsLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0f1629]"
        role="status"
        aria-label="Loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#003366] dark:text-blue-300" />
      </div>
    );
  }

  if (hasNoLinkedWards) return <NoLinkedWardState />;
  if (!isStepComplete('parent-profile')) return <ParentProfileConfirmStep />;
  if (!isStepComplete('select-ward')) return <WardSelectionStep />;
  return <ParentSetupChecklist />;
}
