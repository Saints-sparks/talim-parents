import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParentOnboarding } from "../../contexts/ParentOnboardingContext";
import { useSelectedStudent } from "../../contexts/SelectedStudentContext";
import ParentOnboardingLayout from "./ParentOnboardingLayout";
import WardCard from "./WardCard";

export default function WardSelectionStep() {
  const {
    wards,
    wardsLoading,
    selectDefaultWard,
    unmarkStepComplete,
  } = useParentOnboarding();
  const { selectedStudent } = useSelectedStudent();
  const [selectedWard, setSelectedWard] = useState(selectedStudent || wards[0] || null);

  const selectedId = useMemo(
    () => selectedWard?._id || selectedWard?.userId?._id || selectedWard?.userId?.userId,
    [selectedWard]
  );

  const handleContinue = () => {
    if (!selectedWard) return;
    selectDefaultWard(selectedWard);
  };

  return (
    <ParentOnboardingLayout stepLabel="Step 2 of 8">
      <div>
        <h1 className="text-xl font-bold text-[#030E18]">Select your default ward</h1>
        <p className="mt-2 text-sm text-[#657386]">
          You can switch between your children anytime from the top bar.
        </p>

        <div className="mt-6 space-y-3">
          {wardsLoading ? (
            <div className="flex h-40 items-center justify-center text-[#003366]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            wards.map((ward) => {
              const wardId = ward?._id || ward?.userId?._id || ward?.userId?.userId;
              return (
                <WardCard
                  key={wardId}
                  ward={ward}
                  selected={selectedId === wardId}
                  onSelect={setSelectedWard}
                />
              );
            })
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => unmarkStepComplete("parent-profile")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#E6EAF0] bg-white text-sm font-semibold text-[#263442] hover:bg-[#F7F9FB]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedWard}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#003366] text-sm font-semibold text-white hover:bg-[#002244] disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </ParentOnboardingLayout>
  );
}
