import React, { useEffect } from "react";
import { TbCalendarMonth } from "react-icons/tb";
import { PiCalendarDotsLight } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { useLeaveRequest } from "../hooks/useLeaveRequests";
import LeaveRequestTable from "../Components/LeaveRequestTable";
import LeaveRequestTableSkeleton from "../Components/LeaveRequestTableSkeleton"; // import skeleton
import LoadError from "../Components/loadError";

function RequestLeave() {
  const navigate = useNavigate();
  const { leaveRequests, loading, error, fetchLeaveRequestsByChild } = useLeaveRequest();

  const loadLeaveRequests = () => {
    const parentStudents = JSON.parse(localStorage.getItem("parent_students") || "[]");
    if (parentStudents.length > 0) {
      const childId = parentStudents[0].userId?._id;
      if (childId) {
        fetchLeaveRequestsByChild(childId);
      }
    }
  };

  useEffect(() => {
    loadLeaveRequests();
  }, []);

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

      <div className="bg-white rounded-lg shadow border border-gray-200 min-h-[200px] p-4">
        {loading && <LeaveRequestTableSkeleton />}

        {error && (
          <LoadError
            message={`Failed to load leave requests: ${error}`}
            onRetry={loadLeaveRequests}
          />
        )}

        {!loading && !error && (
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









