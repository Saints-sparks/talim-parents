import { useNavigate } from 'react-router-dom';
import { CalendarPlus, ClipboardList, FileText } from 'lucide-react';
import { useLeaveRequests } from '../hooks/useLeaveRequests';
import { useActiveChild } from '../hooks/useActiveChild';
import LeaveRequestTable from '../Components/LeaveRequestTable';
import LeaveRequestTableSkeleton from '../Components/LeaveRequestTableSkeleton';
import { ErrorState } from '../Components/StateComponents';
import { childFullName } from '../types/parent';

/**
 * What the parent sees before they have raised anything.
 *
 * @param props - Component props.
 * @param props.childName - Whose list this is.
 * @param props.hasLinkedChild - False when no child could be resolved.
 * @param props.onNewRequest - Opens the form.
 * @returns The empty state.
 */
function LeaveRequestEmptyState({
  childName,
  hasLinkedChild,
  onNewRequest,
}: {
  childName: string;
  hasLinkedChild: boolean;
  onNewRequest: () => void;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-[#DCE5F2] bg-[#F8FAFD] px-4 py-10 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF2FB] text-[#003366] dark:bg-blue-950/60 dark:text-blue-300">
          <ClipboardList className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-[#101828] dark:text-slate-100">
          {hasLinkedChild ? 'No leave requests yet' : 'No child selected'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#667085] dark:text-slate-400">
          {hasLinkedChild
            ? `${childName} does not have any leave requests yet. When you submit one, its status and details will appear here.`
            : 'We could not find a linked child to load leave requests for this account.'}
        </p>

        <div className="mt-6 grid gap-3 rounded-xl border border-[#E5EAF2] bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#0A4EA3] dark:text-blue-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-[#101828] dark:text-slate-100">Track every request</p>
              <p className="mt-1 text-xs leading-5 text-[#667085] dark:text-slate-400">
                Approved, pending and rejected requests are listed with dates and request type.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarPlus className="mt-0.5 h-5 w-5 shrink-0 text-[#0A4EA3] dark:text-blue-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-[#101828] dark:text-slate-100">Create a request when needed</p>
              <p className="mt-1 text-xs leading-5 text-[#667085] dark:text-slate-400">
                Submit absence details for school review in a few steps.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewRequest}
          disabled={!hasLinkedChild}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#003366] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#00264D] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          New leave request
        </button>
      </div>
    </div>
  );
}

/**
 * The leave requests raised for the child the parent is looking at.
 *
 * @returns The page.
 */
export default function RequestLeave() {
  const navigate = useNavigate();
  // Verified against the parent's linked children before any request is made.
  const { child: activeChild, childId: activeChildId, status: childStatus } = useActiveChild();

  const { data: leaveRequests, isPending, isError, error, refetch } = useLeaveRequests(activeChildId);
  const loading = childStatus === 'loading' || (Boolean(activeChildId) && isPending);
  const openForm = (): void => {
    navigate('/leaveform');
  };

  return (
    <div className="relative flex min-h-screen flex-col gap-6 p-6">
      <div data-guide="leave-header" className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[20px] text-gray-900 dark:text-slate-100">Request leave</h1>
          <p className="text-[18px] text-[#aaaaaa] dark:text-slate-400">
            Submit a leave request for {activeChild ? childFullName(activeChild) : 'your child'}
          </p>
        </div>

        <div data-guide="leave-new-request" className="mt-auto hidden shrink-0 sm:flex">
          <button
            type="button"
            onClick={openForm}
            disabled={!activeChildId}
            className="flex items-center gap-1 rounded-lg bg-[#003366] px-[15px] py-[10px] text-white shadow-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> New request
          </button>
        </div>
      </div>

      <div
        data-guide="leave-list"
        className="min-h-[200px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {loading && <LeaveRequestTableSkeleton />}

        {!loading && isError && (
          <ErrorState
            error={error}
            onRetry={() => void refetch()}
            title="Couldn't load leave requests"
          />
        )}

        {!loading && !isError && (leaveRequests?.length ?? 0) === 0 && (
          <LeaveRequestEmptyState
            childName={childFullName(activeChild) || 'your child'}
            hasLinkedChild={Boolean(activeChildId)}
            onNewRequest={openForm}
          />
        )}

        {!loading && !isError && (leaveRequests?.length ?? 0) > 0 && (
          <LeaveRequestTable leaveRequests={leaveRequests ?? []} onNewRequest={openForm} />
        )}
      </div>
    </div>
  );
}
