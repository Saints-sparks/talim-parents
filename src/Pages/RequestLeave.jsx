import React, { useState, useEffect } from "react";
import { TbCalendarMonth, TbFileDownload, TbPlus } from "react-icons/tb";
import { IoMdTime } from "react-icons/io";
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { MdArrowBackIos, MdArrowForwardIos } from "react-icons/md";
import { useLeaveRequests } from "../hooks/useLeaveRequests";
import { useAuth } from "../services/auth.services";

function RequestLeave() {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();
  const { authToken, user } = useAuth();
  const {
    leaveRequests,
    loading,
    error,
    getLeaveRequestsByChild,
    getLeaveRequestsByTeacher,
  } = useLeaveRequests(authToken);

  // Format date to "MMM DD, YYYY" format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Format leave period
  const formatLeavePeriod = (startDate, endDate) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Fetch leave requests based on user role
  useEffect(() => {
    if (user?.role === 'parent') {
      const childId = localStorage.getItem('parent_id'); // Or get from user context
      if (childId) {
        getLeaveRequestsByChild(childId);
      }
    } else if (user?.role === 'teacher') {
      getLeaveRequestsByTeacher(user.userId);
    }
  }, [user, getLeaveRequestsByChild, getLeaveRequestsByTeacher]);

  const totalPages = Math.ceil(leaveRequests.length / rowsPerPage);
  const currentRequests = leaveRequests.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const StatusBadge = ({ status }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        status === "APPROVED"
          ? "bg-green-50 text-green-700"
          : status === "PENDING"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {status === "APPROVED" && <AiOutlineCheckCircle className="h-3.5 w-3.5" />}
      {status === "PENDING" && <IoMdTime className="h-3.5 w-3.5" />}
      {status === "REJECTED" && <AiOutlineCloseCircle className="h-3.5 w-3.5" />}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );

  const handleDownload = (requestId) => {
    // Implement download functionality
    console.log(`Downloading leave request ${requestId}`);
  };

  if (loading && leaveRequests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#003366] mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md mx-auto">
            <p className="font-medium">Error loading leave requests</p>
            <p className="mt-2 text-sm">{error.message || "Please try again later"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Request Student Absence</h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">
            {user?.role === 'parent' 
              ? "Submit a leave request for your child's upcoming absence" 
              : "Review student leave requests"}
          </p>
        </div>
        {user?.role === 'parent' && (
          <button
            onClick={() => navigate("/leaveform")}
            className="fixed sm:relative bottom-6 right-6 sm:bottom-auto sm:right-auto z-10 sm:z-0 bg-[#003366] text-white rounded-full sm:rounded-lg shadow-lg sm:shadow-sm hover:bg-[#002855] transition-colors w-14 h-14 sm:w-auto sm:h-auto flex items-center justify-center sm:px-4 sm:py-2 sm:gap-2"
          >
            <TbPlus className="h-6 w-6 sm:hidden" />
            <TbCalendarMonth className="hidden sm:block h-5 w-5" />
            <span className="hidden sm:inline">New Request</span>
          </button>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-hidden">
        {leaveRequests.length > 0 ? (
          <table className="w-full text-sm text-gray-500">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentRequests.map((req) => (
                <tr key={req._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(req.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatLeavePeriod(req.startDate, req.endDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{req.leaveType}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button 
                      onClick={() => handleDownload(req._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003366]"
                    >
                      <TbFileDownload className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <TbCalendarMonth className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              {user?.role === 'parent' 
                ? "Get started by creating a new leave request." 
                : "No pending leave requests to review."}
            </p>
            {user?.role === 'parent' && (
              <div className="mt-6">
                <button
                  onClick={() => navigate("/leaveform")}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#003366] hover:bg-[#002855] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003366]"
                >
                  <TbPlus className="-ml-1 mr-2 h-5 w-5" />
                  New Request
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile View - Cards */}
      <div className="sm:hidden space-y-4">
        {leaveRequests.length > 0 ? (
          currentRequests.map((req) => (
            <div key={req._id} className="bg-white rounded-lg shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatDate(req.createdAt)}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatLeavePeriod(req.startDate, req.endDate)}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">{req.leaveType}</span>
                <button 
                  onClick={() => handleDownload(req._id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700"
                >
                  <TbFileDownload className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <TbCalendarMonth className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              {user?.role === 'parent' 
                ? "Get started by creating a new leave request." 
                : "No pending leave requests to review."}
            </p>
            {user?.role === 'parent' && (
              <button
                onClick={() => navigate("/leaveform")}
                className="mt-4 fixed bottom-6 right-6 z-10 bg-[#003366] text-white rounded-full shadow-lg hover:bg-[#002855] transition-colors w-14 h-14 flex items-center justify-center"
              >
                <TbPlus className="h-6 w-6" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls - Only show if there are leave requests */}
      {leaveRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border-t border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Rows per page</span>
                <select
                  className="rounded-md border-gray-300 py-1 pl-2 pr-8 text-sm focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing rows per page
                  }}
                >
                  {[5, 10, 20, 50].map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-gray-700">
                Showing {currentPage * rowsPerPage - rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, leaveRequests.length)} of {leaveRequests.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <select
                  className="rounded-md border-gray-300 py-1 pl-2 pr-8 text-sm focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-700">of {totalPages}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1} 
                  className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <MdArrowBackIos className="h-5 w-5 text-gray-500" />
                </button>
                <button 
                  disabled={currentPage === totalPages} 
                  className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <MdArrowForwardIos className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestLeave;