import React, { useEffect, useMemo } from "react";
import { TbCalendarMonth } from "react-icons/tb";
import { CalendarPlus, ClipboardList, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLeaveRequest } from "../hooks/useLeaveRequests";
import LeaveRequestTable from "../Components/LeaveRequestTable";
import LeaveRequestTableSkeleton from "../Components/LeaveRequestTableSkeleton"; // import skeleton
import LoadError from "../Components/loadError";
import { useParentOnboarding } from "../contexts/ParentOnboardingContext";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";

const getStudentName = (student) => {
  const user = student?.userId || {};
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "your child";
};

function LeaveRequestEmptyState({ childName, hasLinkedChild, onNewRequest }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-[#DCE5F2] bg-[#F8FAFD] px-4 py-10">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF2FB] text-[#003366]">
          <ClipboardList className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-[#101828]">
          {hasLinkedChild ? "No leave requests yet" : "No child selected"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          {hasLinkedChild
            ? `${childName} does not have any leave requests yet. When you submit one, its status and details will appear here.`
            : "We could not find a linked child to load leave requests for this account."}
        </p>

        <div className="mt-6 grid gap-3 rounded-xl border border-[#E5EAF2] bg-white p-4 text-left">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#0A4EA3]" />
            <div>
              <p className="text-sm font-bold text-[#101828]">Track every request</p>
              <p className="mt-1 text-xs leading-5 text-[#667085]">
                Approved, pending, and rejected requests will be listed with dates and request type.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarPlus className="mt-0.5 h-5 w-5 shrink-0 text-[#0A4EA3]" />
            <div>
              <p className="text-sm font-bold text-[#101828]">Create a request when needed</p>
              <p className="mt-1 text-xs leading-5 text-[#667085]">
                Submit absence details for school review in a few steps.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewRequest}
          disabled={!hasLinkedChild}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#003366] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#00264D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <TbCalendarMonth />
          New Leave Request
        </button>
      </div>
    </div>
  );
}

function RequestLeave() {
  const navigate = useNavigate();
  const { leaveRequests, loading, error, fetchLeaveRequestsByChild } = useLeaveRequest();
  const { wards = [], wardsLoading } = useParentOnboarding();
  const { selectedStudent } = useSelectedStudent();

  const activeChild = useMemo(() => selectedStudent || wards[0] || null, [selectedStudent, wards]);
  const activeChildId =
    (typeof activeChild?.userId === "string" && activeChild.userId) ||
    activeChild?.userId?._id ||
    activeChild?.userId?.id ||
    activeChild?.userId?.userId;
  const hasLinkedChild = Boolean(activeChildId);

  const loadLeaveRequests = () => {
    if (!activeChildId) return;
    fetchLeaveRequestsByChild(activeChildId).catch(() => {});
  };

  useEffect(() => {
    if (activeChildId) {
      fetchLeaveRequestsByChild(activeChildId).catch(() => {});
    }
  }, [activeChildId]);

  const handleNewRequest = () => {
    navigate("/leaveform");
  };

  return (
    <div className="flex min-h-screen p-6 flex-col gap-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[20px]">Request Leave</h1>
          <p className="text-[#aaaaaa] text-[18px]">
            Submit a leave request for your child's upcoming absence
          </p>
        </div>

        <div className="hidden sm:flex space-x-3 mt-auto">
          <button
            onClick={handleNewRequest}
            className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105"
          >
            <TbCalendarMonth /> New Request
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[200px] p-4">
        {(loading || wardsLoading) && <LeaveRequestTableSkeleton />}

        {!loading && !wardsLoading && error && (
          <LoadError
            message={`Failed to load leave requests: ${error}`}
            onRetry={loadLeaveRequests}
          />
        )}

        {!loading && !wardsLoading && !error && leaveRequests.length === 0 && (
          <LeaveRequestEmptyState
            childName={getStudentName(activeChild)}
            hasLinkedChild={hasLinkedChild}
            onNewRequest={handleNewRequest}
          />
        )}

        {!loading && !wardsLoading && !error && leaveRequests.length > 0 && (
          <LeaveRequestTable
            leaveRequests={leaveRequests}
            onNewRequest={handleNewRequest}
          />
        )}
      </div>
    </div>
  );
}

export default RequestLeave;









