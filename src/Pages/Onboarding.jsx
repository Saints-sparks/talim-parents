import { Loader2 } from "lucide-react";
import NoLinkedWardState from "../Components/onboarding/NoLinkedWardState";
import ParentProfileConfirmStep from "../Components/onboarding/ParentProfileConfirmStep";
import ParentSetupChecklist from "../Components/onboarding/ParentSetupChecklist";
import WardSelectionStep from "../Components/onboarding/WardSelectionStep";
import { useParentOnboarding } from "../contexts/ParentOnboardingContext";

export default function Onboarding() {
  const {
    wardsLoading,
    isHydrated,
    hasNoLinkedWards,
    isStepComplete,
  } = useParentOnboarding();

  if (!isHydrated || wardsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    );
  }

  if (hasNoLinkedWards) {
    return <NoLinkedWardState />;
  }

  if (!isStepComplete("parent-profile")) {
    return <ParentProfileConfirmStep />;
  }

  if (!isStepComplete("select-ward")) {
    return <WardSelectionStep />;
  }

  return <ParentSetupChecklist />;
}
