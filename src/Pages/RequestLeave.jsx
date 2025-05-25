import React, { useEffect } from "react";
import { TbCalendarMonth } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { useLeaveRequest } from "../hooks/useLeaveRequests";
import LeaveRequestTable from "../Components/LeaveRequestTable";

function RequestLeave() {
  const navigate = useNavigate();
  const { leaveRequests, loading, error, fetchLeaveRequestsByChild } = useLeaveRequest();

  useEffect(() => {
    const parentStudents = JSON.parse(localStorage.getItem("parent_students") || "[]");
    if (parentStudents.length > 0) {
      const childId = parentStudents[0]._id || parentStudents[0].child?._id || parentStudents[0].child;
      if (childId) {
        fetchLeaveRequestsByChild(childId);
      }
    }
  }, []);

  return (
    <div className="flex min-h-screen p-6 flex-col gap-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[20px]">Request Leave</h1>
          <p className="text-[#aaaaaa] text-[18px]">
            Submit a leave request for your child's upcoming absence
          </p>
        </div>

        <div className="flex space-x-3 mt-auto">
          <button
            onClick={() => navigate("/leaveform")}  // <-- Redirect here
            className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105"
          >
            New Request <TbCalendarMonth />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        {loading && <p className="p-6 text-center text-gray-500">Loading leave requests...</p>}
        {error && <p className="p-6 text-center text-red-600">Error: {error}</p>}
        {!loading && !error && <LeaveRequestTable leaveRequests={leaveRequests} />}
      </div>
    </div>
  );
}

export default RequestLeave;
