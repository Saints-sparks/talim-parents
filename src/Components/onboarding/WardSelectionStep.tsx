import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useParentOnboarding } from '../../contexts/ParentOnboardingContext';
import { useSelectedStudent } from '../../contexts/SelectedStudentContext';
import { childRecordId, type ParentChild } from '../../types/parent';
import ParentOnboardingLayout from './ParentOnboardingLayout';
import WardCard from './WardCard';

/**
 * Which child to start with: the one already chosen if they are still linked,
 * else the parent's saved default, else the first.
 *
 * @param wards - The linked children.
 * @param selected - The child remembered from a previous visit.
 * @returns The starting choice, or `null` when there are no children.
 */
function initialWard(wards: ParentChild[], selected: ParentChild | null): ParentChild | null {
  const selectedId = childRecordId(selected);
  return (
    wards.find((ward) => selectedId !== undefined && childRecordId(ward) === selectedId) ??
    wards.find((ward) => ward.isDefault) ??
    wards[0] ??
    null
  );
}

/**
 * Step 2 of onboarding: choose the child the portal opens on.
 *
 * @returns The ward picker.
 */
export default function WardSelectionStep() {
  const { wards, wardsLoading, wardsError, refreshWards, selectDefaultWard, unmarkStepComplete } = useParentOnboarding();
  const { selectedStudent } = useSelectedStudent();
  const [selectedWard, setSelectedWard] = useState<ParentChild | null>(() => initialWard(wards, selectedStudent));

  const selectedId = childRecordId(selectedWard);

  const retry = (): void => {
    // A failure lands in `wardsError` through the shared query, so it is
    // already shown; nothing more to do with the rejection here.
    refreshWards().catch(() => undefined);
  };

  return (
    <ParentOnboardingLayout stepLabel="Step 2 of 8">
      <div>
        <h1 className="text-xl font-bold text-[#030E18] dark:text-slate-100">Select your default ward</h1>
        <p className="mt-2 text-sm text-[#657386] dark:text-slate-300">
          You can switch between your children anytime from the top bar.
        </p>

        <div className="mt-6 space-y-3">
          {wardsLoading ? (
            <div className="flex h-40 items-center justify-center text-[#003366] dark:text-blue-300">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : wardsError ? (
            <div role="alert" className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <p>{wardsError}</p>
              <button type="button" onClick={retry} className="mt-2 font-semibold underline">
                Try again
              </button>
            </div>
          ) : (
            wards.map((ward) => {
              const wardId = childRecordId(ward);
              return (
                <WardCard
                  key={wardId ?? ward.childUserId}
                  ward={ward}
                  selected={selectedId !== undefined && selectedId === wardId}
                  onSelect={setSelectedWard}
                />
              );
            })
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => unmarkStepComplete('parent-profile')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#E6EAF0] bg-white text-sm font-semibold text-[#263442] hover:bg-[#F7F9FB] dark:border-[#2a3a5a] dark:bg-transparent dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => selectedWard && selectDefaultWard(selectedWard)}
            disabled={!selectedWard}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#003366] text-sm font-semibold text-white hover:bg-[#002244] disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </ParentOnboardingLayout>
  );
}
