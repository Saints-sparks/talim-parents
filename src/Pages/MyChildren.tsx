import { useMemo, useState } from 'react';
import { Info, Plus, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChildCard from '../Components/parent/ChildCard';
import ChildrenOverviewCards, { type OverviewFigures } from '../Components/parent/ChildrenOverviewCards';
import RecentUpdatesList from '../Components/parent/RecentUpdatesList';
import ParentQuickActions from '../Components/parent/ParentQuickActions';
import { EmptyChildrenState } from '../Components/parent/EmptyStates';
import { displayName } from '../Components/parent/parentUtils';
import { toast } from '../Components/CustomToast';
import { ErrorState, LoadingState } from '../Components/StateComponents';
import { useChildrenOverview, useChildrenUpdates } from '../hooks/useChildrenOverview';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { setDefaultChild } from '../services/parent.services';
import { getErrorMessage } from '../lib/apiError';
import { childFullName, childRecordId, type ParentChild } from '../types/parent';

/**
 * The title row, with the way to link another child.
 *
 * @returns The header.
 */
function PageTop() {
  const navigate = useNavigate();
  return (
    <div data-guide="children-header" className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-[#0A4EA3] dark:text-blue-300">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-extrabold">Parent Dashboard</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold text-[#101828] md:text-3xl dark:text-slate-100">My Children</h1>
        <p className="mt-1 text-sm font-medium text-[#667085] md:text-base dark:text-slate-400">
          View and manage your children linked to your account.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/onboarding')}
        className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#003366] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#0A4EA3] dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Link Another Child
      </button>
    </div>
  );
}

/**
 * Figures worked out from the children list, for when the overview request
 * fails. Every number is a real field of a child the API returned.
 *
 * @param wards - The linked children.
 * @returns The fallback figures.
 */
function figuresFromWards(wards: ParentChild[]): OverviewFigures {
  const attendance = wards.map((child) => Number(child.attendancePercentage || 0)).filter((value) => value > 0);
  return {
    totalChildren: wards.length,
    averageAttendance: attendance.length ? Math.round(attendance.reduce((a, b) => a + b, 0) / attendance.length) : 0,
    averageGrade: wards.find((child) => child.currentGradeSummary)?.currentGradeSummary || 'N/A',
    totalSubjects: wards.reduce((sum, child) => sum + Number(child.subjectsCount || 0), 0),
  };
}

/**
 * Every child linked to the account, with the overview and recent updates
 * across them, and the choice of primary child.
 *
 * @returns The page.
 */
export default function MyChildren() {
  const navigate = useNavigate();
  const { wards, wardsLoading, wardsError, refreshWards } = useParentOnboarding();
  const { selectedStudent, updateSelectedStudent } = useSelectedStudent();
  const overview = useChildrenOverview();
  const updates = useChildrenUpdates();
  const [savingDefault, setSavingDefault] = useState(false);

  const selectedId = childRecordId(selectedStudent);
  const figures: OverviewFigures = useMemo(
    () => (overview.data ? { ...overview.data } : figuresFromWards(wards)),
    [overview.data, wards],
  );

  const handleSetPrimary = async (child: ParentChild): Promise<void> => {
    const childId = childRecordId(child);
    if (!childId || savingDefault) return;
    setSavingDefault(true);
    updateSelectedStudent(child);
    try {
      await setDefaultChild(childId);
      toast.success(`${displayName(childFullName(child))} is now your primary child.`);
      await refreshWards();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not set primary child.'));
    } finally {
      setSavingDefault(false);
    }
  };

  if (wardsLoading && !wards.length) {
    return (
      <div className="space-y-6">
        <PageTop />
        <LoadingState count={2} className="h-72" label="Loading your children" />
      </div>
    );
  }

  if (wardsError && !wards.length) {
    return (
      <div className="space-y-6">
        <PageTop />
        <ErrorState
          error={null}
          fallback={wardsError}
          onRetry={() => void refreshWards()}
          title="Failed to fetch children"
        />
      </div>
    );
  }

  if (!wards.length) {
    return (
      <div className="space-y-6">
        <PageTop />
        <EmptyChildrenState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTop />

      <div data-guide="children-list" className="grid gap-5 xl:grid-cols-2">
        {wards.map((child) => {
          const childId = childRecordId(child);
          return (
            <ChildCard
              key={childId}
              child={child}
              selected={childId === selectedId}
              isPrimary={Boolean(child.isDefault)}
              busy={savingDefault}
              onSetPrimary={(picked) => void handleSetPrimary(picked)}
              onViewProfile={() => navigate('/profile')}
            />
          );
        })}
      </div>

      <div data-guide="children-overview">
        <ChildrenOverviewCards overview={figures} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <RecentUpdatesList updates={updates.data ?? []} />
        <div className="space-y-5">
          <div data-guide="children-actions">
            <ParentQuickActions />
          </div>
          <div className="flex gap-3 rounded-2xl bg-[#EAF2FF] p-5 text-[#0A4EA3] dark:bg-blue-950/40 dark:text-blue-300">
            <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#344054] dark:text-slate-300">
              <span className="block font-extrabold text-[#0A4EA3] dark:text-blue-300">Need help?</span>
              If you can’t find your child or see incorrect information, please contact your school administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
